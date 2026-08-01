import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertBootstrapEnvironment, bootstrapOwnerSchema } from "@/lib/auth/bootstrap-owner";
import { firstAccessSchema } from "@/lib/auth/first-access";

describe("owner bootstrap and first access", () => {
  it("normalizes the bootstrap email and accepts a strong temporary password", () => {
    const result = bootstrapOwnerSchema.parse({ ownerEmail: " Owner@Clinic.COM ", ownerName: "Owner", temporaryPassword: "Temporary!234", tenantName: "Clinic", tenantSlug: "clinic-one" });
    expect(result.ownerEmail).toBe("owner@clinic.com");
  });

  it("rejects weak passwords and unsafe slugs", () => {
    expect(() => bootstrapOwnerSchema.parse({ ownerEmail: "owner@example.com", ownerName: "Owner", temporaryPassword: "weak", tenantName: "Clinic", tenantSlug: "../clinic" })).toThrow();
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
