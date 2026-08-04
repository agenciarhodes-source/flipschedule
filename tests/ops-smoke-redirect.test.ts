import { describe, expect, it } from "vitest";

import { runSmoke, validateRootRedirect } from "@/scripts/ops-smoke";

const base = new URL("https://staging.example.test/");
const secureHeaders = {
  "x-robots-tag": "noindex, nofollow",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
};

function smokeFetcher(rootHeaders: Record<string, string> = secureHeaders): typeof fetch {
  return (async (input: URL | RequestInfo) => {
    const url = input instanceof URL ? input : new URL(String(input));
    if (url.pathname === "/api/health/live") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...secureHeaders, "content-type": "application/json" },
      });
    }
    if (url.pathname === "/api/health/ready") {
      return new Response(JSON.stringify({ status: "ready" }), {
        status: 200,
        headers: { ...secureHeaders, "content-type": "application/json" },
      });
    }
    if (url.pathname === "/login") {
      return new Response("AMBIENTE DE HOMOLOGAÇÃO", {
        status: 200,
        headers: secureHeaders,
      });
    }
    return new Response(null, {
      status: 307,
      headers: { ...rootHeaders, location: "/login" },
    });
  }) as typeof fetch;
}

describe("canonical smoke redirect", () => {
  it("accepts only canonical login", () => {
    expect(validateRootRedirect(base, "/login").href).toBe(
      "https://staging.example.test/login",
    );
  });

  it.each([
    "https://evil.example.test/login",
    "https://production.example.test/login",
    "https://user:pass@staging.example.test/login",
    "/login?next=/",
    "/login#fragment",
    "/login/",
    "/",
  ])("rejects %s", (value) => {
    expect(() =>
      validateRootRedirect(base, value, "production.example.test"),
    ).toThrow("SMOKE_REDIRECT_DENIED");
  });

  it("requires Location", () => {
    expect(() => validateRootRedirect(base, null)).toThrow(
      "SMOKE_REDIRECT_LOCATION_REQUIRED",
    );
  });

  it("accepts the canonical root redirect only with security headers", async () => {
    await expect(runSmoke(base, smokeFetcher())).resolves.toMatchObject({ "/": 307 });
  });

  it("rejects the canonical redirect when hardening headers are absent", async () => {
    await expect(runSmoke(base, smokeFetcher({}))).rejects.toThrow(
      "SMOKE_NOINDEX_MISSING",
    );
  });
});
