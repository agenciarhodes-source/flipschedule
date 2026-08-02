import { PrismaNeon } from "@prisma/adapter-neon";
import { hashPassword } from "better-auth/crypto";
import { z, ZodError } from "zod";

import { PrismaClient } from "@/generated/prisma/client";
import { readDatabaseEnv } from "@/lib/db/env";
import { passwordSchema } from "./password-policy";
import { normalizeEmail } from "./utils";

const slugSchema = z.string().trim().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const bootstrapOwnerSchema = z.object({
  ownerEmail: z.string().trim().email().transform(normalizeEmail),
  ownerName: z.string().trim().min(2).max(120),
  temporaryPassword: passwordSchema,
  tenantName: z.string().trim().min(2).max(120),
  tenantSlug: slugSchema,
});

export type BootstrapOwnerInput = z.input<typeof bootstrapOwnerSchema>;

export class BootstrapConfigurationError extends Error {
  override name = "BootstrapConfigurationError";
}

export class BootstrapConflictError extends Error {
  override name = "BootstrapConflictError";
}

export function assertBootstrapEnvironment(environment: Record<string, string | undefined>) {
  const appEnv = environment.APP_ENV ?? environment.NODE_ENV ?? "development";
  const url = environment.DATABASE_URL ?? "";
  if (!/^postgres(?:ql)?:\/\//.test(url) || url.includes("-pooler")) {
    throw new BootstrapConfigurationError("A direct PostgreSQL connection is required.");
  }
  if (
    appEnv === "production" &&
    !(environment.GITHUB_ACTIONS === "true" && environment.BOOTSTRAP_PRODUCTION_CONFIRMED === "BOOTSTRAP")
  ) {
    throw new BootstrapConfigurationError("Bootstrap is not allowed in this environment.");
  }
  if (!["development", "test", "production"].includes(appEnv)) {
    throw new BootstrapConfigurationError("Bootstrap is not allowed in this environment.");
  }
}

type BootstrapDatabase = Pick<PrismaClient, "$transaction">;

function getBootstrapDatabase(): BootstrapDatabase {
  const { databaseUrl } = readDatabaseEnv();
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: databaseUrl }) });
}

export async function bootstrapOwner(
  input: BootstrapOwnerInput,
  database: BootstrapDatabase = getBootstrapDatabase(),
) {
  const data = bootstrapOwnerSchema.parse(input);
  const password = await hashPassword(data.temporaryPassword);

  return database.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({ where: { emailNormalized: data.ownerEmail } });
    const existingTenant = await tx.tenant.findUnique({ where: { slug: data.tenantSlug } });
    if (existingUser && existingTenant) {
      const membership = await tx.membership.findUnique({ where: { tenantId_userId: { tenantId: existingTenant.id, userId: existingUser.id } } });
      const account = await tx.authAccount.findUnique({ where: { providerId_accountId: { providerId: "credential", accountId: existingUser.id } } });
      if (membership?.role === "OWNER" && membership.status === "ACTIVE" && account) {
        return { tenantId: existingTenant.id, userId: existingUser.id, created: false };
      }
      throw new BootstrapConflictError("Existing records do not form a valid owner bootstrap.");
    }
    if (existingUser || existingTenant) {
      throw new BootstrapConflictError("Existing records conflict with the owner bootstrap.");
    }

    const tenant = await tx.tenant.create({ data: { name: data.tenantName, slug: data.tenantSlug, timezone: "America/Sao_Paulo" } });
    await tx.clinic.create({ data: { tenantId: tenant.id, name: data.tenantName, slug: data.tenantSlug } });
    const user = await tx.user.create({ data: { emailNormalized: data.ownerEmail, displayName: data.ownerName, emailVerified: true, emailVerifiedAt: new Date(), mustChangePassword: true } });
    const membership = await tx.membership.create({ data: { tenantId: tenant.id, userId: user.id, role: "OWNER", status: "ACTIVE", acceptedAt: new Date() } });
    await tx.authAccount.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password } });
    await tx.auditLog.create({ data: { tenantId: tenant.id, actorUserId: user.id, actorMembershipId: membership.id, action: "owner.bootstrap", resourceType: "User", resourceId: user.id, outcome: "SUCCESS" } });
    return { tenantId: tenant.id, userId: user.id, created: true };
  });
}

const schemaErrorCodes = new Set(["P2021", "P2022"]);
const connectionErrorCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1011", "P1017"]);

export function classifyBootstrapError(error: unknown): string {
  if (error instanceof BootstrapConfigurationError || error instanceof ZodError) {
    return "Owner bootstrap failed: invalid bootstrap configuration.";
  }
  if (error instanceof BootstrapConflictError || getErrorCode(error) === "P2002") {
    return "Owner bootstrap failed: conflicting existing records.";
  }
  const code = getErrorCode(error);
  if (code && schemaErrorCodes.has(code)) {
    return "Owner bootstrap failed: database schema is not up to date.";
  }
  if (code && connectionErrorCodes.has(code)) {
    return "Owner bootstrap failed: database connection unavailable.";
  }
  return "Owner bootstrap failed: unexpected internal error.";
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}
