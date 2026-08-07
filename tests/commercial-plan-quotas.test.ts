import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  commercialQuotaAllows,
  commercialQuotaState,
} from "@/domains/application/commercial-quota";

describe("commercial plan quotas", () => {
  it("supports unlimited plans without inventing a numeric ceiling", () => {
    expect(commercialQuotaState(12, null)).toEqual({
      used: 12,
      limit: null,
      remaining: null,
      reached: false,
    });
    expect(commercialQuotaAllows(10_000, null, 1)).toBe(true);
  });

  it("calculates remaining capacity and rejects usage above the contract", () => {
    expect(commercialQuotaState(2, 5)).toEqual({
      used: 2,
      limit: 5,
      remaining: 3,
      reached: false,
    });
    expect(commercialQuotaState(5, 5).reached).toBe(true);
    expect(commercialQuotaAllows(4, 5, 1)).toBe(true);
    expect(commercialQuotaAllows(5, 5, 1)).toBe(false);
    expect(commercialQuotaAllows(6, 5, 0)).toBe(false);
  });

  it("rejects invalid quota arithmetic", () => {
    expect(() => commercialQuotaState(-1, 5)).toThrow("INVALID_QUOTA_USAGE");
    expect(() => commercialQuotaState(1, -1)).toThrow("INVALID_QUOTA_LIMIT");
    expect(() => commercialQuotaAllows(1, 5, -1)).toThrow("INVALID_QUOTA_INCREMENT");
  });

  it("counts active units, seat-bearing memberships and valid pending invitations", () => {
    const source = readFileSync(
      "domains/infrastructure/prisma/commercial-plan-quota.ts",
      "utf8",
    );
    expect(source).toContain('const seatStatuses = ["INVITED", "ACTIVE", "SUSPENDED"]');
    expect(source).toContain('db.clinic.count({ where: { tenantId, status: "ACTIVE" } })');
    expect(source).toContain("acceptedAt: null");
    expect(source).toContain("revokedAt: null");
    expect(source).toContain("expiresAt: { gt: now }");
  });

  it("serializes quota-changing unit operations", () => {
    const policy = readFileSync(
      "domains/infrastructure/prisma/commercial-plan-quota.ts",
      "utf8",
    );
    const factory = readFileSync("domains/infrastructure/prisma/factory.ts", "utf8");
    expect(policy).toContain("pg_advisory_xact_lock(350058");
    expect(policy).toContain('isolationLevel: "Serializable"');
    expect(policy).toContain("capacity.clinics.reached");
    expect(policy).toContain("const reactivating");
    expect(factory).toContain("clinics: new CommercialClinicService(context)");
  });

  it("enforces seats without removing multiunit invitation scopes", () => {
    const team = readFileSync(
      "domains/infrastructure/prisma/team-service.ts",
      "utf8",
    );
    expect(team).toContain("assertUserQuotaAvailable");
    expect(team).toContain('"ADD_RESERVATION"');
    expect(team).toContain('"CURRENT_RESERVATIONS_VALID"');
    expect(team).toContain("COMMERCIAL_USER_LIMIT_REACHED");
    expect(team).toContain('target.status === "REVOKED"');
    expect(team).toContain("tenantInvitationClinicAccess.createMany");
    expect(team).toContain("membershipClinicAccess.createMany");
    expect(team).toContain("clinicCount !== clinicIds.length");
  });

  it("blocks assigning a plan below current reserved tenant usage", () => {
    const customerService = readFileSync(
      "domains/infrastructure/platform/customer-service.ts",
      "utf8",
    );
    const adminActions = readFileSync(
      "app/(platform-admin)/admin/clients/actions.ts",
      "utf8",
    );
    const adminPage = readFileSync(
      "app/(platform-admin)/admin/clients/page.tsx",
      "utf8",
    );
    expect(customerService).toContain("lockCommercialQuota(tx, tenant.id)");
    expect(customerService).toContain("readCommercialPlanCapacity(tx, tenant.id)");
    expect(customerService).toContain(
      "commercialQuotaAllows(capacity.clinics.active, plan.maxClinics, 0)",
    );
    expect(customerService).toContain(
      "commercialQuotaAllows(capacity.users.reserved, plan.maxUsers, 0)",
    );
    expect(customerService).toContain("PLAN_CLINIC_LIMIT_BELOW_USAGE");
    expect(customerService).toContain("PLAN_USER_LIMIT_BELOW_USAGE");
    expect(adminActions).toContain('return "plan-capacity"');
    expect(adminPage).toContain('"plan-capacity"');
  });

  it("shows plan capacity while preserving clinic access administration", () => {
    const settings = readFileSync(
      "components/modules/settings/real-settings-view.tsx",
      "utf8",
    );
    const teamSettings = readFileSync(
      "components/modules/settings/team-settings.tsx",
      "utf8",
    );
    const page = readFileSync(
      "app/(platform)/[tenantSlug]/configuracoes/page.tsx",
      "utf8",
    );
    expect(page).toContain("CommercialPlanQuotaReader");
    expect(page).toContain("ClinicAccessSettings");
    expect(settings).toContain("Plano, assinatura e capacidade");
    expect(settings).toContain("capacity.clinics.reached");
    expect(settings).toContain("clinics={clinics}");
    expect(teamSettings).toContain("capacity.users.reached");
    expect(teamSettings).toContain("name=\"clinicIds\"");
    expect(teamSettings).toContain("Limite atingido");
  });
});
