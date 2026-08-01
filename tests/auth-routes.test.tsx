import { describe, expect, it, vi } from "vitest";

const { authApiGetSession } = vi.hoisted(() => ({ authApiGetSession: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/lib/auth/server", () => ({
  getAuth: () => ({
    api: {
      getSession: authApiGetSession,
    },
  }),
}));

describe("auth route guards", () => {
  it("returns access denied when the session is missing", async () => {
    authApiGetSession.mockResolvedValue(null);

    const { getAuthenticatedSessionContext } = await import("@/lib/auth/session");
    await expect(getAuthenticatedSessionContext()).rejects.toThrow(/Access unavailable/i);
  });
});
