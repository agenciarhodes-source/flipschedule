import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("authentication access matrix", () => {
  it("routes each authenticated profile to the correct surface", async () => {
    const { selectPostLoginDestination } = await import("@/lib/auth/post-login-destination");

    expect(selectPostLoginDestination({ hasActivePlatformAccess: true })).toBe("/admin");
    expect(
      selectPostLoginDestination({
        hasActivePlatformAccess: false,
        firstAccessRequired: true,
      }),
    ).toBe("/first-access");
    expect(
      selectPostLoginDestination({
        hasActivePlatformAccess: false,
        tenantSlug: "clinica-a",
      }),
    ).toBe("/clinica-a/dashboard");
    expect(selectPostLoginDestination({ hasActivePlatformAccess: false })).toBe(
      "/access-pending",
    );
  });

  it("keeps unknown and active identities in credential validation but blocks inactive identities", async () => {
    const { canUserSignIn } = await import("@/lib/auth/sign-in-policy");
    type Database = Parameters<typeof canUserSignIn>[0];

    const database = (status: "ACTIVE" | "SUSPENDED" | "DISABLED" | null) =>
      ({
        user: {
          findUnique: vi.fn(async () => (status ? { status } : null)),
        },
      }) as unknown as Database;

    await expect(canUserSignIn(database(null), "unknown@example.test")).resolves.toBe(true);
    await expect(canUserSignIn(database("ACTIVE"), "active@example.test")).resolves.toBe(true);
    await expect(
      canUserSignIn(database("SUSPENDED"), "suspended@example.test"),
    ).resolves.toBe(false);
    await expect(
      canUserSignIn(database("DISABLED"), "disabled@example.test"),
    ).resolves.toBe(false);
  });

  it("keeps direct dashboard access behind the login screen", () => {
    const dashboard = readFileSync("app/(platform)/dashboard/page.tsx", "utf8");
    const login = readFileSync("components/auth/login-page-content.tsx", "utf8");

    expect(dashboard).toContain('redirect("/login?reason=login-required")');
    expect(login).toContain("markTabSessionActivity");
    expect(login).toContain("rememberMe: false");
  });

  it("runs a permanent disposable PostgreSQL rehearsal", () => {
    const workflow = readFileSync(".github/workflows/auth-access-rehearsal.yml", "utf8");
    const script = readFileSync("scripts/auth-access-rehearsal.ts", "utf8");

    expect(workflow).toContain("postgres:17");
    expect(workflow).toContain("scripts/auth-access-rehearsal.ts");
    expect(workflow).toContain("EXTERNAL_EFFECTS_MODE: DISABLED");
    expect(script).toContain("AUTH_REHEARSAL_SUSPENDED_USER_ALLOWED");
    expect(script).toContain("AUTH_REHEARSAL_EXPIRED_SESSION_ALLOWED");
    expect(script).toContain("resolvePostLoginDestinationForUser");
  });
});
