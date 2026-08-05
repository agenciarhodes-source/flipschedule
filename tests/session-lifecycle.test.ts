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
    expect(server).not.toContain("60 * 60 * 24 * 14");
  });

  it("creates a browser-session cookie instead of remembering the login", () => {
    const login = readFileSync("components/auth/login-page-content.tsx", "utf8");
    expect(login).toContain("rememberMe: false");
    expect(login).toContain("markSessionActivity()");
    expect(login).toContain("Sua sessão expirou após 1 hora sem atividade.");
  });

  it("checks the server session and signs out inactive users", () => {
    const guard = readFileSync("components/auth/session-inactivity-guard.tsx", "utf8");
    expect(guard).toContain("SESSION_IDLE_TIMEOUT_MS");
    expect(guard).toContain("disableCookieCache: true");
    expect(guard).toContain("await authClient.signOut()");
    expect(guard).toContain('window.location.replace(`/login?reason=${reason}`)');
    expect(guard).not.toContain("beforeunload");
    expect(guard).not.toContain("pagehide");
  });

  it("protects tenant, admin and first-access surfaces", () => {
    const tenantLayout = readFileSync("app/(platform)/[tenantSlug]/layout.tsx", "utf8");
    const adminLayout = readFileSync("app/(platform-admin)/admin/layout.tsx", "utf8");
    const firstAccess = readFileSync("app/(auth)/first-access/page.tsx", "utf8");

    expect(tenantLayout).toContain("<SessionInactivityGuard />");
    expect(adminLayout).toContain("<SessionInactivityGuard />");
    expect(firstAccess).toContain("<SessionInactivityGuard />");
  });
});
