import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assertBootstrapEnvironment,
  BootstrapConflictError,
  bootstrapOwner,
  bootstrapOwnerSchema,
  classifyBootstrapError,
} from "@/lib/auth/bootstrap-owner-core";
import { firstAccessSchema } from "@/lib/auth/first-access";

describe("owner bootstrap and first access", () => {
  it("normalizes the bootstrap email and accepts a strong temporary password", () => {
    const result = bootstrapOwnerSchema.parse({ ownerEmail: " Owner@Clinic.COM ", ownerName: "Owner", temporaryPassword: "Temporary!234", tenantName: "Clinic", tenantSlug: "clinic-one" });
    expect(result.ownerEmail).toBe("owner@clinic.com");
  });

  it("rejects weak passwords and unsafe slugs", () => {
    expect(() => bootstrapOwnerSchema.parse({ ownerEmail: "owner@example.com", ownerName: "Owner", temporaryPassword: "weak", tenantName: "Clinic", tenantSlug: "../clinic" })).toThrow();
  });

  it("classifies invalid input and conflicts without exposing input values", () => {
    const sensitiveValue = "NeverLogThis!234";
    const invalidInputError = bootstrapOwnerSchema.safeParse({
      ownerEmail: "owner@example.test",
      ownerName: "Owner",
      temporaryPassword: sensitiveValue.slice(0, 4),
      tenantName: "Clinic",
      tenantSlug: "clinic-one",
    }).error;
    const invalidMessage = classifyBootstrapError(invalidInputError);
    const conflictMessage = classifyBootstrapError(new BootstrapConflictError(sensitiveValue));

    expect(invalidMessage).toBe("Owner bootstrap failed: invalid bootstrap configuration.");
    expect(conflictMessage).toBe("Owner bootstrap failed: conflicting existing records.");
    expect(`${invalidMessage}${conflictMessage}`).not.toContain(sensitiveValue);
  });

  it("remains idempotent when the complete owner bootstrap already exists", async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: "user-id" }), create: vi.fn() },
      tenant: { findUnique: vi.fn().mockResolvedValue({ id: "tenant-id" }), create: vi.fn() },
      membership: { findUnique: vi.fn().mockResolvedValue({ role: "OWNER", status: "ACTIVE" }), create: vi.fn() },
      authAccount: { findUnique: vi.fn().mockResolvedValue({ id: "account-id" }), create: vi.fn() },
      clinic: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    const database = {
      $transaction: vi.fn(async (operation: (transaction: typeof tx) => unknown) => operation(tx)),
    } as unknown as NonNullable<Parameters<typeof bootstrapOwner>[1]>;

    await expect(bootstrapOwner({
      ownerEmail: "owner@example.test",
      ownerName: "Owner Example",
      temporaryPassword: "Temporary!234",
      tenantName: "Example Clinic",
      tenantSlug: "example-clinic",
    }, database)).resolves.toEqual({ tenantId: "tenant-id", userId: "user-id", created: false });
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.tenant.create).not.toHaveBeenCalled();
    expect(tx.authAccount.create).not.toHaveBeenCalled();
  });

  it("never permits production without the protected workflow confirmation", () => {
    expect(() => assertBootstrapEnvironment({ APP_ENV: "production", DATABASE_URL: "postgresql://example/direct" })).toThrow(/not allowed/);
  });

  it("rejects pooled administrative connections", () => {
    expect(() => assertBootstrapEnvironment({ APP_ENV: "development", DATABASE_URL: "postgresql://example-pooler/db" })).toThrow(/direct/);
  });

  it("prevents temporary-password reuse and mismatched confirmation", () => {
    const base = { currentPassword: "Temporary!234", newPassword: "Permanent!234", confirmation: "Permanent!234" };
    expect(firstAccessSchema.safeParse(base).success).toBe(true);
    expect(firstAccessSchema.safeParse({ ...base, newPassword: base.currentPassword, confirmation: base.currentPassword }).success).toBe(false);
    expect(firstAccessSchema.safeParse({ ...base, confirmation: "Different!234" }).success).toBe(false);
  });
});
