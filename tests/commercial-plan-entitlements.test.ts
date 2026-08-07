import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  CommercialPlanUsageError,
  assertCommercialCapacity,
  assertCommercialPlanSupportsUsage,
  commercialUsageMessage,
} from "@/domains/application/billing/commercial-entitlements";

function expectUsageError(
  operation: () => void,
  code: CommercialPlanUsageError["code"],
) {
  let thrown: unknown;
  try {
    operation();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(CommercialPlanUsageError);
  expect(thrown).toMatchObject({ code });
}

describe("commercial plan entitlements", () => {
  it("treats null limits as unlimited and allows the exact configured capacity", () => {
    expect(() =>
      assertCommercialCapacity({ resource: "clinics", limit: null, current: 10_000 }),
    ).not.toThrow();
    expect(() =>
      assertCommercialCapacity({ resource: "users", limit: 3, current: 2, additional: 1 }),
    ).not.toThrow();
  });

  it("blocks usage above clinic and user limits with typed errors", () => {
    expectUsageError(
      () => assertCommercialCapacity({ resource: "clinics", limit: 1, current: 1 }),
      "CLINIC_LIMIT_REACHED",
    );
    expectUsageError(
      () => assertCommercialCapacity({ resource: "users", limit: 5, current: 5 }),
      "USER_LIMIT_REACHED",
    );
  });

  it("rejects a plan that cannot cover current active usage", () => {
    expectUsageError(
      () =>
        assertCommercialPlanSupportsUsage(
          { maxClinics: 2, maxUsers: 10 },
          { clinics: 3, users: 4 },
        ),
      "CLINIC_LIMIT_REACHED",
    );

    expectUsageError(
      () =>
        assertCommercialPlanSupportsUsage(
          { maxClinics: null, maxUsers: 2 },
          { clinics: 20, users: 3 },
        ),
      "USER_LIMIT_REACHED",
    );
  });

  it("returns upgrade-oriented pt-BR feedback without exposing tenant data", () => {
    const error = new CommercialPlanUsageError("users", 3, 3, 4);
    expect(commercialUsageMessage(error)).toBe(
      "Seu plano permite até 3 usuário(s) ativo(s). Faça upgrade para adicionar outro usuário.",
    );
    expect(commercialUsageMessage(error)).not.toMatch(/email|telefone|cpf/i);
  });

  it("enforces unit capacity on creation and reactivation in a serializable transaction", () => {
    const source = readFileSync("domains/infrastructure/prisma/services.ts", "utf8");
    expect(source).toContain("assertTenantClinicCapacity(tx,this.context.tenantId)");
    expect(source).toContain('exists.status!=="ACTIVE"');
    expect(source).toContain('isolationLevel:"Serializable"');
    expect(source).toContain("commercialUsageMessage(error)");
  });

  it("reserves seats for pending invites and rechecks capacity on acceptance/reactivation", () => {
    const source = readFileSync("domains/infrastructure/prisma/team-service.ts", "utf8");
    expect(source).toContain("reservePendingInvitations: true");
    expect(source).toContain("assertTenantUserCapacity(tx,invite.tenantId)");
    expect(source).toContain('data.status==="ACTIVE"&&target.status!=="ACTIVE"');
    expect(source).toContain('isolationLevel:"Serializable"');
  });

  it("resolves limits only from tenant-scoped non-ended subscriptions", () => {
    const source = readFileSync(
      "domains/infrastructure/prisma/commercial-entitlements.ts",
      "utf8",
    );
    expect(source).toContain("tenantId,");
    expect(source).toContain('status: { in: ["PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED"] }');
    expect(source).toContain('status: "ACTIVE"');
  });

  it("prevents assigning a plan below the tenant current active usage", () => {
    const source = readFileSync(
      "domains/infrastructure/platform/customer-service.ts",
      "utf8",
    );
    expect(source).toContain("assertPlanSupportsTenantUsage(tx, tenant.id");
    expect(source).toContain("maxClinics: plan.maxClinics");
    expect(source).toContain("maxUsers: plan.maxUsers");
  });
});
