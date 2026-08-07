import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  canAccessClinic,
  parseClinicAccess,
  scopedClinicIds,
  serializeClinicAccess,
} from "@/domains/application/clinic-access";

describe("multi-clinic access scopes", () => {
  it("keeps legacy memberships and owners compatible with all clinics", () => {
    expect(parseClinicAccess(null, "MANAGER")).toEqual({ mode: "ALL", clinicIds: [] });
    expect(
      parseClinicAccess(
        { mode: "SELECTED", clinicIds: ["11111111-1111-4111-8111-111111111111"] },
        "OWNER",
      ),
    ).toEqual({ mode: "ALL", clinicIds: [] });
  });

  it("fails closed for malformed non-null scopes", () => {
    expect(parseClinicAccess({ mode: "SELECTED", clinicIds: ["not-a-uuid"] }, "MANAGER"))
      .toEqual({ mode: "SELECTED", clinicIds: [] });
    expect(parseClinicAccess({ unexpected: true }, "RECEPTIONIST"))
      .toEqual({ mode: "SELECTED", clinicIds: [] });
  });

  it("deduplicates selected clinics and checks access deterministically", () => {
    const clinicA = "11111111-1111-4111-8111-111111111111";
    const clinicB = "22222222-2222-4222-8222-222222222222";
    const scope = parseClinicAccess(
      { mode: "SELECTED", clinicIds: [clinicA, clinicA] },
      "MANAGER",
    );
    expect(scope).toEqual({ mode: "SELECTED", clinicIds: [clinicA] });
    expect(canAccessClinic({ clinicAccess: scope }, clinicA)).toBe(true);
    expect(canAccessClinic({ clinicAccess: scope }, clinicB)).toBe(false);
    expect(scopedClinicIds({ clinicAccess: scope })).toEqual([clinicA]);
    expect(serializeClinicAccess({ mode: "ALL" })).toEqual({ mode: "ALL" });
  });

  it("stores scope on memberships and invitations with an additive migration", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync(
      "prisma/migrations/20260806220000_add_clinic_access_scopes/migration.sql",
      "utf8",
    );

    expect(schema).toMatch(/model Membership[\s\S]*clinicAccess\s+Json\?/);
    expect(schema).toMatch(/model TenantInvitation[\s\S]*clinicAccess\s+Json\?/);
    expect(migration).toContain('ALTER TABLE "Membership"');
    expect(migration).toContain('ALTER TABLE "TenantInvitation"');
    expect(migration).toContain('ADD COLUMN "clinicAccess" JSONB');
    expect(migration).not.toMatch(/DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/i);
  });

  it("derives the clinic scope at the authenticated server boundary", () => {
    const resolution = readFileSync("lib/auth/session-resolution.ts", "utf8");
    const applicationContext = readFileSync("lib/auth/application-context.ts", "utf8");

    expect(resolution).toContain("clinicAccess: true");
    expect(resolution).toContain("parseClinicAccess(activeMembership.clinicAccess");
    expect(applicationContext).toContain("clinicAccess: context.clinicAccess");
  });

  it("routes clinic-sensitive modules through scoped adapters", () => {
    const factory = readFileSync("domains/infrastructure/prisma/factory.ts", "utf8");

    for (const adapter of [
      "ScopedClinicReader",
      "ScopedProfessionalReader",
      "ScopedResourceReader",
      "ScopedWorkingHoursReader",
      "ScopedAppointmentReader",
      "ScopedLeadReader",
      "ScopedPatientReader",
      "ScopedTreatmentPlanReader",
      "ScopedConversationReader",
      "ScopedClinicService",
      "ScopedProfessionalService",
      "ScopedAppointmentService",
      "ScopedLeadService",
      "ScopedPatientService",
      "ScopedTreatmentPlanService",
      "ScopedConversationService",
    ]) {
      expect(factory).toContain(adapter);
    }
  });

  it("preserves links outside a restricted manager's scope when editing professionals", () => {
    const services = readFileSync(
      "domains/infrastructure/prisma/clinic-scoped-services.ts",
      "utf8",
    );

    expect(services).toContain("preservedOutsideScope");
    expect(services).toContain("mergedClinicIds");
    expect(services).toContain("professional-only block");
    expect(services).toContain("if (!clinicId) return denied()");
  });

  it("fails closed for unassigned commercial records and patient-only inbox conversations", () => {
    const commercial = readFileSync(
      "domains/infrastructure/prisma/clinic-scoped-commercial-services.ts",
      "utf8",
    );
    const inbox = readFileSync(
      "domains/infrastructure/prisma/clinic-scoped-treatment-inbox-readers.ts",
      "utf8",
    );

    expect(commercial).toContain("if (!clinicId || !canAccessClinic");
    expect(commercial).toContain("Patient-only\n   * conversations fail closed");
    expect(inbox).toContain("Patient-only conversations remain tenant-wide");
    expect(inbox).toContain("return { lead: { clinicId: { in: ids } } }");
  });

  it("scopes reports instead of exposing tenant-wide totals to branch users", () => {
    const reports = readFileSync("domains/infrastructure/prisma/reports-settings.ts", "utf8");

    expect(reports).toContain("const allowed=scopedClinicIds(this.context)");
    expect(reports).toContain("const clinicScope=allowed===null?{}:{clinicId:{in:allowed}}");
    expect(reports).toContain("const patientScope=allowed===null?{}");
    expect(reports).toContain("const conversationScope=allowed===null?{}");
  });

  it("lets managers grant only authorized active clinics and carries scope through invitations", () => {
    const team = readFileSync("domains/infrastructure/prisma/team-service.ts", "utf8");
    const rbac = readFileSync("domains/application/rbac.ts", "utf8");

    expect(rbac).toContain('"team.update_clinic_access"');
    expect(team).toContain("canAccessClinic(this.context, clinicId)");
    expect(team).toContain('status: "ACTIVE"');
    expect(team).toContain("clinicAccess: serializeClinicAccess(access)");
    expect(team).toContain("clinicAccess: invite.clinicAccess ?? { mode: \"ALL\" }");
    expect(team).toContain("O proprietário sempre precisa ter acesso a todas as unidades.");
  });

  it("keeps the synthetic owner explicitly global", () => {
    const scenario = readFileSync("domains/pilot/scenario-runner.ts", "utf8");
    expect(scenario).toContain('clinicAccess: { mode: "ALL", clinicIds: [] }');
  });
});
