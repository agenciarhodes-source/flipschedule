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

  it("keeps /dashboard as a server-side tenant resolver", () => {
    const source = readFileSync("app/(platform)/dashboard/page.tsx", "utf8");
    expect(source).toContain("requireAccessForRoute");
    expect(source).toContain("buildTenantDashboardPath(context.tenantSlug)");
    expect(source).toContain('export const dynamic = "force-dynamic"');
  });
});
