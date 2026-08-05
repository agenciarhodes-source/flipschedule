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

  it("requires the login screen when /dashboard is opened directly", () => {
    const source = readFileSync("app/(platform)/dashboard/page.tsx", "utf8");
    expect(source).toContain('redirect("/login?reason=login-required")');
    expect(source).not.toContain("resolvePostLoginDestination");
  });

  it("resolves the platform or tenant destination only after authentication", () => {
    const route = readFileSync(
      "app/api/auth/post-login-destination/route.ts",
      "utf8",
    );
    const resolver = readFileSync("lib/auth/post-login-destination.ts", "utf8");

    expect(route).toContain("resolvePostLoginDestination()");
    expect(route).toContain('destination === "/login"');
    expect(route).toContain('"Cache-Control": "no-store"');
    expect(resolver).toContain('return "/admin"');
    expect(resolver).toContain("getAuthenticatedSessionContext()");
    expect(resolver).toContain("buildTenantDashboardPath(input.tenantSlug)");
    expect(resolver).not.toContain("searchParams");
  });
});
