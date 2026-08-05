import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildTenantDashboardPath } from "@/lib/auth/post-login";

describe("post-login routing", () => {
  it("builds the tenant-scoped dashboard path", () => {
    expect(buildTenantDashboardPath("clinica-central")).toBe("/clinica-central/dashboard");
  });

  it("encodes the trusted slug before composing the path", () => {
    expect(buildTenantDashboardPath("clinica central")).toBe("/clinica%20central/dashboard");
  });

  it("keeps /dashboard as a server-side platform and tenant resolver", () => {
    const source = readFileSync("app/(platform)/dashboard/page.tsx", "utf8");
    const resolver = readFileSync("lib/auth/post-login-destination.ts", "utf8");
    expect(source).toContain("resolvePostLoginDestination");
    expect(source).toContain("redirect(await resolvePostLoginDestination())");
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(resolver).toContain('return "/admin"');
    expect(resolver).toContain("getAuthenticatedSessionContext()");
    expect(resolver).toContain("buildTenantDashboardPath(input.tenantSlug)");
    expect(resolver).not.toContain("searchParams");
  });
});
