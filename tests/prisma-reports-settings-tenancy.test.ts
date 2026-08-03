import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("reports and organization security contract", () => {
  const source = readFileSync("domains/infrastructure/prisma/reports-settings.ts", "utf8");
  const rbacSource = readFileSync("domains/application/rbac.ts", "utf8");
  const publicService = readFileSync("domains/infrastructure/prisma/treatment-inbox-services.ts", "utf8");

  it("scopes every report and settings query to trusted context", () => {
    expect(source).toContain("tenantId=this.context.tenantId");
    expect(source).toContain("id:this.context.tenantId");
    expect(source).not.toMatch(/tenantId:\s*(input|query|form)/);
  });

  it("allows organization writes only through the central RBAC permission and audits them", () => {
    expect(source).toContain('hasPermission(this.context.membershipRole,"organization.update")');
    expect(rbacSource).toMatch(/OWNER:\s*new Set\(permissions\)/);
    expect(rbacSource).toMatch(/MANAGER:\s*new Set\([\s\S]*?"organization\.update"/);
    expect(source).toContain('action:"tenant.settings.update"');
    expect(source).toContain("actorMembershipId:this.context.membershipId");
  });

  it("keeps raw public tokens out of paths and query strings", () => {
    expect(publicService).toContain("/plano#token=");
    expect(publicService).not.toContain("/plano/${token}");
    expect(readFileSync("components/public-plan/public-plan-from-fragment.tsx", "utf8")).toContain("history.replaceState");
  });
});
