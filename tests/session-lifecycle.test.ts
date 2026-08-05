import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("session lifecycle", () => {
  it("expires sessions after one hour without activity", async () => {
    const policy = await import("@/lib/auth/session-policy");
    expect(policy.SESSION_IDLE_TIMEOUT_SECONDS).toBe(60 * 60);
    expect(policy.SESSION_REFRESH_INTERVAL_SECONDS).toBe(5 * 60);

    const server = readFileSync("lib/auth/server.ts", "utf8");
    expect(server).toContain("expiresIn: SESSION_IDLE_TIMEOUT_SECONDS");
    expect(server).toContain("updateAge: SESSION_REFRESH_INTERVAL_SECONDS");
  });

  it("requires a fresh login for the current tab", () => {
    const login = readFileSync("components/auth/login-page-content.tsx", "utf8");
    const loginLayout = readFileSync("app/(auth)/login/layout.tsx", "utf8");
    const tabSession = readFileSync("lib/auth/tab-session.ts", "utf8");

    expect(login).toContain("rememberMe: false");
    expect(login).toContain("clearTabSession()");
    expect(login).toContain("markTabSessionActivity()");
    expect(login).toContain("/api/auth/post-login-destination");
    expect(loginLayout).not.toContain("redirect(");
    expect(tabSession).toContain("window.sessionStorage");
    expect(tabSession).not.toContain("localStorage");
  });

  it("blocks protected UI until tab and server sessions are valid", () => {
    const guard = readFileSync("components/auth/session-inactivity-guard.tsx", "utf8");
    expect(guard).toContain("readTabSessionActivity()");
    expect(guard).toContain('redirectToLogin("tab")');
    expect(guard).toContain("disableCookieCache: true");
    expect(guard).toContain("if (!isValidated) return null");
  });

  it("protects tenant, admin and first-access surfaces", () => {
    const tenantLayout = readFileSync("app/(platform)/[tenantSlug]/layout.tsx", "utf8");
    const adminLayout = readFileSync("app/(platform-admin)/admin/layout.tsx", "utf8");
    const firstAccess = readFileSync("app/(auth)/first-access/page.tsx", "utf8");
    const dashboard = readFileSync("app/(platform)/dashboard/page.tsx", "utf8");

    expect(tenantLayout).toContain("<SessionInactivityGuard>");
    expect(adminLayout).toContain("<SessionInactivityGuard>");
    expect(firstAccess).toContain("<SessionInactivityGuard>");
    expect(dashboard).toContain('redirect("/login?reason=login-required")');
  });
});
