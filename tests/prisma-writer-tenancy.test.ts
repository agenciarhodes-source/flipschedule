import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Prisma writer security contract", () => {
  const source = readFileSync("domains/infrastructure/prisma/services.ts", "utf8");

  it("derives mutation scope and audit actors from trusted context", () => {
    expect(source.match(/tenantId:this\.context\.tenantId/g)?.length).toBeGreaterThan(25);
    expect(source).toContain("actorMembershipId: this.context.membershipId");
    expect(source).not.toMatch(/tenantId:\s*(input|form|query)/);
  });

  it("checks appointment relations, conflicts and serializable writes", () => {
    expect(source).toContain("professionalClinic.findFirst");
    expect(source).toContain("resourceId:p.resourceId");
    expect(source).toContain("startsAt:{lt:p.endsAt}");
    expect(source).toContain('isolationLevel:"Serializable"');
    expect(source).toContain("appointmentStatusHistory.create");
  });

  it("keeps Prisma out of React components and demo routes unchanged", () => {
    for (const file of ["components/modules/agenda/real-agenda-view.tsx", "components/modules/settings/real-settings-view.tsx"]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/@\/generated\/prisma|@\/lib\/db/);
    }
    expect(readFileSync("app/(demo)/demo/agenda/page.tsx", "utf8")).toContain("AgendaView");
    expect(readFileSync("app/(demo)/demo/configuracoes/page.tsx", "utf8")).toContain("/demo/configuracoes/clinica");
  });
});
