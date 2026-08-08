import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/client";
import { getPublicApplicationOrigin } from "@/lib/runtime/config";
import { passwordSchema } from "@/lib/auth/password-policy";
import { applyProvenPasswordChange, revokeUserSessions } from "@/lib/auth/password-change";
import { sendTransactionalEmail } from "@/lib/email/service";
import { renderAccountActivationEmail } from "@/lib/email/templates/account-activation";
import { structuredLog } from "@/lib/observability/logger";

export const ACCOUNT_ACTIVATION_PURPOSE = "ACCOUNT_ACTIVATION";
export const ACCOUNT_ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

export const accountActivationSchema = z
  .object({
    token: z.string().trim().startsWith("act_").min(36).max(256),
    newPassword: passwordSchema,
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, { path: ["confirmation"] });

export function generateAccountActivationToken() {
  return `act_${randomBytes(TOKEN_BYTES).toString("base64url")}`;
}

export function hashAccountActivationToken(token: string) {
  return createHash("sha256")
    .update(`${ACCOUNT_ACTIVATION_PURPOSE}\u001f${token}`, "utf8")
    .digest("hex");
}

export function buildAccountActivationUrl(token: string) {
  const url = new URL("/activate-account", getPublicApplicationOrigin());
  url.searchParams.set("token", token);
  return url.toString();
}

export async function issueAccountActivation(input: {
  userId: string;
  recipientEmail: string;
  workspaceName: string;
}) {
  const prisma = getPrismaClient();
  const now = new Date();
  const rawToken = generateAccountActivationToken();
  const tokenHash = hashAccountActivationToken(rawToken);
  const expiresAt = new Date(now.getTime() + ACCOUNT_ACTIVATION_TTL_MS);

  const created = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: input.userId,
        purpose: ACCOUNT_ACTIVATION_PURPOSE,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });
    return tx.passwordResetToken.create({
      data: {
        userId: input.userId,
        purpose: ACCOUNT_ACTIVATION_PURPOSE,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });
  });

  try {
    const message = renderAccountActivationEmail({
      activationUrl: buildAccountActivationUrl(rawToken),
      workspaceName: input.workspaceName,
      expiresAt,
    });
    await sendTransactionalEmail({
      kind: "PASSWORD_RESET",
      deliveryReference: created.id,
      recipientEmail: input.recipientEmail,
      ...message,
    });
    structuredLog("info", "auth.account_activation.delivery_scheduled", {
      resourceType: "User",
      resourceId: input.userId,
      status: "SCHEDULED",
    });
    return { ok: true as const, expiresAt };
  } catch {
    await prisma.passwordResetToken.updateMany({
      where: { id: created.id, consumedAt: null },
      data: { revokedAt: new Date() },
    });
    structuredLog("warn", "auth.account_activation.delivery_failed", {
      resourceType: "User",
      resourceId: input.userId,
      errorCode: "ACCOUNT_ACTIVATION_DELIVERY_UNAVAILABLE",
    });
    return { ok: false as const, expiresAt };
  }
}

export async function activateAccount(input: unknown) {
  const parsed = accountActivationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Este link de ativação é inválido ou expirou." };
  }

  const prisma = getPrismaClient();
  const now = new Date();
  const tokenHash = hashAccountActivationToken(parsed.data.token);
  try {
    await prisma.$transaction(
      async (tx) => {
        const consumed = await tx.passwordResetToken.updateMany({
          where: {
            tokenHash,
            purpose: ACCOUNT_ACTIVATION_PURPOSE,
            consumedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) throw new Error("ACCOUNT_ACTIVATION_INVALID");

        const token = await tx.passwordResetToken.findUnique({
          where: { tokenHash },
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                id: true,
                status: true,
                memberships: {
                  where: { role: "OWNER", status: "ACTIVE" },
                  take: 1,
                  select: { id: true, tenantId: true },
                },
              },
            },
          },
        });
        const membership = token?.user?.memberships[0];
        if (!token?.user || token.user.status !== "ACTIVE" || !membership) {
          throw new Error("ACCOUNT_ACTIVATION_INVALID");
        }

        await applyProvenPasswordChange(tx, token.userId, parsed.data.newPassword, now);
        await tx.user.update({
          where: { id: token.userId },
          data: { emailVerified: true, emailVerifiedAt: now },
        });
        await tx.passwordResetToken.updateMany({
          where: {
            userId: token.userId,
            purpose: ACCOUNT_ACTIVATION_PURPOSE,
            id: { not: token.id },
            consumedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });
        await revokeUserSessions(tx, token.userId);
        await tx.auditLog.create({
          data: {
            tenantId: membership.tenantId,
            actorUserId: token.userId,
            actorMembershipId: membership.id,
            action: "identity.account_activation.completed",
            resourceType: "User",
            resourceId: token.userId,
            outcome: "SUCCESS",
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return { ok: true as const, message: "Acesso ativado. Entre com seu e-mail e a senha que você acabou de criar." };
  } catch {
    structuredLog("warn", "auth.account_activation.rejected", {
      errorCode: "ACCOUNT_ACTIVATION_INVALID",
    });
    return { ok: false as const, message: "Este link de ativação é inválido ou expirou." };
  }
}
