import { afterEach, describe, expect, it, vi } from "vitest";

const { getAuthMock } = vi.hoisted(() => ({ getAuthMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/lib/auth/server", () => ({ getAuth: getAuthMock }));

describe("lazy authentication route handlers", () => {
  afterEach(() => {
    getAuthMock.mockReset();
    vi.resetModules();
  });

  it("imports logout without initializing authentication", async () => {
    await expect(import("@/app/(auth)/logout/route")).resolves.toBeDefined();
    expect(getAuthMock).not.toHaveBeenCalled();
  });

  it("imports the Better Auth API route without initializing authentication", async () => {
    await expect(import("@/app/api/auth/[...all]/route")).resolves.toBeDefined();
    expect(getAuthMock).not.toHaveBeenCalled();
  });

  it("returns a sanitized 503 for a real auth request without configuration", async () => {
    const { AuthConfigurationError } = await import("@/lib/auth/errors");
    getAuthMock.mockImplementation(() => {
      throw new AuthConfigurationError("sensitive configuration detail");
    });
    const { GET } = await import("@/app/api/auth/[...all]/route");

    const response = await GET(new Request("http://localhost/api/auth/session"));
    const responseBody = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(responseBody)).toEqual({ error: "Authentication service unavailable." });
    expect(responseBody).not.toContain("sensitive");
  });
});
