import "server-only";

import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/client";
import { normalizeEmail } from "./utils";
import { passwordSchema } from "./password-policy";

const slugSchema = z.string().trim().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const bootstrapOwnerSchema = z.object({
  ownerEmail: z.string().trim().email().transform(normalizeEmail),
  ownerName: z.string().trim().min(2).max(120),
  temporaryPassword: passwordSchema,
  tenantName: z.string().trim().min(2).max(120),
  tenantSlug: slugSchema,
});

export type BootstrapOwnerInput = z.input<typeof bootstrapOwnerSchema>;

export function assertBootstrapEnvironment(environment: Record<string, string | undefined>) {
  const appEnv = environment.APP_ENV ?? environment.NODE_ENV ?? "development";
  const url = environment.DATABASE_URL ?? "";
  if (!/^postgres(?:ql)?:\/\//.test(url) || url.includes("-pooler")) throw new Error("Bootstrap requires a direct PostgreSQL connection.");
  if (appEnv === "production" && !(environment.GITHUB_ACTIONS === "true" && environment.BOOTSTRAP_PRODUCTION_CONFIRMED === "BOOTSTRAP")) {
    throw new Error("Bootstrap is not allowed in this environment.");
  }
  if (!['development', 'test', 'production'].includes(appEnv)) throw new Error("Bootstrap is not allowed in this environment.");
}

export async function bootstrapOwner(input: BootstrapOwnerInput) {
  const data = bootstrapOwnerSchema.parse(input);
  const prisma = getPrismaClient();
  const password = await hashPassword(data.temporaryPassword);

  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({ where: { emailNormalized: data.ownerEmail } });
    const existingTenant = await tx.tenant.findUnique({ where: { slug: data.tenantSlug } });
    if (existingUser && existingTenant) {
      const membership = await tx.membership.findUnique({ where: { tenantId_userId: { tenantId: existingTenant.id, userId: existingUser.id } } });
      const account = await tx.authAccount.findUnique({ where: { providerId_accountId: { providerId: "credential", accountId: existingUser.id } } });
      if (membership?.role === "OWNER" && membership.status === "ACTIVE" && account) return { tenantId: existingTenant.id, userId: existingUser.id, created: false };
      throw new Error("Bootstrap state conflicts with existing records.");
    }
    if (existingUser || existingTenant) throw new Error("Bootstrap state conflicts with existing records.");

    const tenant = await tx.tenant.create({ data: { name: data.tenantName, slug: data.tenantSlug, timezone: "America/Sao_Paulo" } });
    await tx.clinic.create({ data: { tenantId: tenant.id, name: data.tenantName, slug: data.tenantSlug } });
    const user = await tx.user.create({ data: { emailNormalized: data.ownerEmail, displayName: data.ownerName, emailVerified: true, emailVerifiedAt: new Date(), mustChangePassword: true } });
    const membership = await tx.membership.create({ data: { tenantId: tenant.id, userId: user.id, role: "OWNER", status: "ACTIVE", acceptedAt: new Date() } });
    await tx.authAccount.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password } });
    await tx.auditLog.create({ data: { tenantId: tenant.id, actorUserId: user.id, actorMembershipId: membership.id, action: "owner.bootstrap", resourceType: "User", resourceId: user.id, outcome: "SUCCESS" } });
    return { tenantId: tenant.id, userId: user.id, created: true };
  });
}
