import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("multiunit clinic access", () => {
  it("keeps owner and manager tenant-wide while restricting operational roles", async () => {
    const { hasTenantWideClinicAccess } = await import(
      "@/domains/infrastructure/prisma/clinic-access"
    );

    expect(hasTenantWideClinicAccess("OWNER")).toBe(true);
    expect(hasTenantWideClinicAccess("MANAGER")).toBe(true);
    expect(hasTenantWideClinicAccess("RECEPTIONIST")).toBe(false);
    expect(hasTenantWideClinicAccess("PROFESSIONAL")).toBe(false);
    expect(hasTenantWideClinicAccess("AGENCY_OPS")).toBe(false);
  });

  it("adds explicit membership and invitation clinic scope with compatibility backfill", () => {
    const schema = readFileSync("prisma/access-scope.prisma", "utf8");
    const migration = readFileSync(
      "prisma/migrations/20260807010000_add_membership_clinic_access/migration.sql",
      "utf8",
    );

    expect(schema).toContain("model MembershipClinicAccess");
    expect(schema).toContain("model TenantInvitationClinicAccess");
    expect(schema).toContain("@@unique([membershipId, clinicId])");
    expect(schema).toContain("@@unique([invitationId, clinicId])");
    expect(migration).toContain('CREATE TABLE "MembershipClinicAccess"');
    expect(migration).toContain('CREATE TABLE "TenantInvitationClinicAccess"');
    expect(migration).toContain('JOIN "Clinic" c ON c."tenantId" = m."tenantId"');
    expect(migration).toContain('JOIN "Clinic" c ON c."tenantId" = i."tenantId"');
    expect(migration).toContain("ON CONFLICT");
  });

  it("enforces clinic scope on operational reads and writes", () => {
    const readers = readFileSync(
      "domains/infrastructure/prisma/readers.ts",
      "utf8",
    );
    const actions = readFileSync(
      "app/(platform)/[tenantSlug]/operational-actions.ts",
      "utf8",
    );

    expect(readers).toContain("resolveClinicAccessScope");
    expect(readers).toContain("clinicId:{in:clinicIds}");
    expect(actions).toContain("canAccessClinic");
    expect(actions).toContain("verifyAppointment");
    expect(actions).toContain("Você não tem acesso a esta unidade.");
  });

  it("provides auditable clinic access administration for team members", () => {
    const service = readFileSync(
      "domains/infrastructure/prisma/clinic-access-management.ts",
      "utf8",
    );
    const rbac = readFileSync("domains/application/rbac.ts", "utf8");
    const settings = readFileSync(
      "components/modules/settings/clinic-access-settings.tsx",
      "utf8",
    );

    expect(rbac).toContain("team.manage_clinic_access");
    expect(service).toContain("team.member.clinic_access_replaced");
    expect(service).toContain('isolationLevel: "Serializable"');
    expect(service).toContain("Proprietários e gestores possuem acesso a todas as unidades");
    expect(settings).toContain("Acesso por unidade");
    expect(settings).toContain("updateMemberClinicAccess");
  });

  it("carries restricted clinic scopes from invitation to accepted membership", () => {
    const teamService = readFileSync(
      "domains/infrastructure/prisma/team-service.ts",
      "utf8",
    );
    const teamSettings = readFileSync(
      "components/modules/settings/team-settings.tsx",
      "utf8",
    );

    expect(teamService).toContain("tenantInvitationClinicAccess.createMany");
    expect(teamService).toContain("tenantInvitationClinicAccess.findMany");
    expect(teamService).toContain("membershipClinicAccess.createMany");
    expect(teamService).toContain("Selecione ao menos uma unidade para este papel");
    expect(teamSettings).toContain("Unidades liberadas");
    expect(teamSettings).toContain('name="clinicIds"');
  });

  it("uses Prisma multi-file schema consistently in development and deploy config", () => {
    const local = readFileSync("prisma.config.ts", "utf8");
    const deploy = readFileSync("prisma.deploy.config.ts", "utf8");
    expect(local).toContain('schema: "prisma"');
    expect(deploy).toContain('schema: "prisma"');
  });
});
