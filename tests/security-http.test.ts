import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("security headers", () => {
  it("does not require runtime origin configuration", async () => {
    const { securityHeaders } = await import("@/lib/security/http");

    expect(() => securityHeaders({ APP_ENV: "production" })).not.toThrow();
    expect(securityHeaders({ APP_ENV: "production" })).not.toHaveProperty("Strict-Transport-Security");
  });

  it("enables HSTS from the request transport context", async () => {
    const { securityHeaders } = await import("@/lib/security/http");

    expect(securityHeaders({}, { secureTransport: true })).toMatchObject({
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
  });

  it("keeps the middleware independent from public origin environment variables", () => {
    const source = readFileSync("middleware.ts", "utf8");

    expect(source).toContain("isSecureRequest(request)");
    expect(source).toContain("securityHeaders(process.env, { secureTransport:");
    expect(source).not.toContain("getPublicApplicationOrigin");
  });
});
