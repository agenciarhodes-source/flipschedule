import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/client";
import { passwordSchema } from "@/lib/auth/password-policy";
import { normalizeEmail } from "@/lib/auth/utils";
import { applyProvenPasswordChange, revokeUserSessions } from "@/lib/auth/password-change";
import { DurableRateLimiter, type RateLimitPolicy } from "@/lib/security/rate-limit";
import { getPublicApplicationOrigin } from "@/lib/runtime/config";
import { structuredLog } from "@/lib/observability/logger";
import { getPasswordResetDelivery } from "./delivery";

export const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
export const PASSWORD_RESET_PUBLIC_MESSAGE = "Se existir uma conta associada a este e-mail, enviaremos as instruções de recuperação.";
export const PASSWORD_RESET_INVALID_MESSAGE = "Este link de recuperação é inválido ou expirou. Solicite um novo link.";
const CLEANUP_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

const requestByEmail: RateLimitPolicy = { scope: "auth.password_reset.request.email", limit: 3, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 };
const requestByIp: RateLimitPolicy = { scope: "auth.password_reset.request.ip", limit: 20, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 };
const resetByIp: RateLimitPolicy = { scope: "auth.password_reset.consume.ip", limit: 10, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 };

export const passwordResetRequestSchema = z.object({ email: z.string().trim().email().max(254).transform(normalizeEmail) });
export const passwordResetSchema = z.object({ token: z.string().trim().min(32).max(256), newPassword: passwordSchema, confirmation: z.string() }).refine(v => v.newPassword === v.confirmation, { path: ["confirmation"] });

export function generatePasswordResetToken() { return randomBytes(TOKEN_BYTES).toString("base64url"); }
export function hashPasswordResetToken(token: string) { return createHash("sha256").update(`${PASSWORD_RESET_PURPOSE}\u001f${token}`, "utf8").digest("hex"); }
export function buildPasswordResetUrl(token: string) { const url = new URL("/reset-password", getPublicApplicationOrigin()); url.searchParams.set("token", token); return url.toString(); }

function clientIp(identity: { ip?: string | null }) { return identity.ip?.trim() || "unknown"; }

export async function requestPasswordReset(input: unknown, identity: { ip?: string | null } = {}) {
  const parsed = passwordResetRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" as const, message: "Informe um e-mail válido." };
  const email = parsed.data.email;
  const prisma = getPrismaClient();
  const limiter = new DurableRateLimiter(prisma);
  const ip = clientIp(identity);
  const [emailLimit, ipLimit] = await Promise.all([limiter.consume([email], requestByEmail), limiter.consume([ip], requestByIp)]);
  if (!emailLimit.allowed || !ipLimit.allowed) { structuredLog("warn", "auth.password_reset.rate_limited", { errorCode: "RATE_LIMITED" }); return { ok: true as const, code: "OK" as const, message: PASSWORD_RESET_PUBLIC_MESSAGE }; }

  const now = new Date();
  const user = await prisma.user.findUnique({ where: { emailNormalized: email }, select: { id: true, status: true } });
  structuredLog("info", "auth.password_reset.requested", { status: user ? "ACCOUNT_MATCHED" : "ACCOUNT_NOT_MATCHED" });
  if (!user || user.status !== "ACTIVE") return { ok: true as const, code: "OK" as const, message: PASSWORD_RESET_PUBLIC_MESSAGE };

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);
  let createdId: string | null = null;
  await prisma.$transaction(async tx => {
    await tx.passwordResetToken.updateMany({ where: { userId: user.id, purpose: PASSWORD_RESET_PURPOSE, consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { revokedAt: now } });
    const created = await tx.passwordResetToken.create({ data: { userId: user.id, purpose: PASSWORD_RESET_PURPOSE, tokenHash, expiresAt } });
    createdId = created.id;
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, OR: [{ expiresAt: { lt: new Date(now.getTime() - CLEANUP_RETENTION_MS) } }, { consumedAt: { lt: new Date(now.getTime() - CLEANUP_RETENTION_MS) } }, { revokedAt: { lt: new Date(now.getTime() - CLEANUP_RETENTION_MS) } }] } });
  });

  try { await getPasswordResetDelivery().sendPasswordReset({ recipientEmail: email, resetUrl: buildPasswordResetUrl(rawToken), expiresAt }); structuredLog("info", "auth.password_reset.delivery_scheduled", { status: "SCHEDULED" }); }
  catch { if (createdId) await prisma.passwordResetToken.updateMany({ where: { id: createdId, consumedAt: null }, data: { revokedAt: new Date() } }); structuredLog("warn", "auth.password_reset.delivery_failed", { errorCode: "PASSWORD_RESET_UNAVAILABLE" }); }
  return { ok: true as const, code: "OK" as const, message: PASSWORD_RESET_PUBLIC_MESSAGE };
}

export async function resetPassword(input: unknown, identity: { ip?: string | null } = {}) {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" as const, message: "Não foi possível redefinir a senha. Revise os dados informados." };
  const prisma = getPrismaClient();
  const limit = await new DurableRateLimiter(prisma).consume([clientIp(identity)], resetByIp);
  if (!limit.allowed) { structuredLog("warn", "auth.password_reset.rate_limited", { errorCode: "RATE_LIMITED" }); return { ok: false as const, code: "RATE_LIMITED" as const, message: PASSWORD_RESET_INVALID_MESSAGE }; }
  const now = new Date();
  const tokenHash = hashPasswordResetToken(parsed.data.token);
  try {
    await prisma.$transaction(async tx => {
      const consumed = await tx.passwordResetToken.updateMany({ where: { tokenHash, purpose: PASSWORD_RESET_PURPOSE, consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (consumed.count !== 1) throw new Error("PASSWORD_RESET_INVALID");
      const token = await tx.passwordResetToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, user: { select: { id: true, status: true } } } });
      if (!token?.user || token.user.status !== "ACTIVE") throw new Error("PASSWORD_RESET_INVALID");
      await applyProvenPasswordChange(tx, token.userId, parsed.data.newPassword, now);
      await tx.passwordResetToken.updateMany({ where: { userId: token.userId, purpose: PASSWORD_RESET_PURPOSE, id: { not: token.id }, consumedAt: null, revokedAt: null }, data: { revokedAt: now } });
      await revokeUserSessions(tx, token.userId);
      await tx.auditLog.create({ data: { actorUserId: token.userId, action: "auth.password_reset.completed", resourceType: "User", resourceId: token.userId, outcome: "SUCCESS", metadata: { sessionsRevoked: true } } });
    }, { isolationLevel: "Serializable" });
    structuredLog("info", "auth.password_reset.completed", { status: "SUCCESS" });
    return { ok: true as const, code: "OK" as const, message: "Senha redefinida com sucesso. Entre novamente para continuar." };
  } catch { structuredLog("warn", "auth.password_reset.rejected", { errorCode: "PASSWORD_RESET_INVALID" }); return { ok: false as const, code: "PASSWORD_RESET_INVALID" as const, message: PASSWORD_RESET_INVALID_MESSAGE }; }
}
