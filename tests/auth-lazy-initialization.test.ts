import { afterEach, describe, expect, it, vi } from "vitest";

const { betterAuthMock, getPrismaClientMock } = vi.hoisted(() => ({
  betterAuthMock: vi.fn(),
  getPrismaClientMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("better-auth", () => ({ betterAuth: betterAuthMock }));
vi.mock("better-auth/crypto", () => ({ hashPassword: vi.fn(), verifyPassword: vi.fn() }));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: vi.fn() }));
vi.mock("better-auth/next-js", () => ({ nextCookies: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getPrismaClient: getPrismaClientMock }));

describe("lazy Better Auth initialization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    betterAuthMock.mockReset();
    getPrismaClientMock.mockReset();
  });

  it("does not initialize authentication when the server module is imported", async () => {
    const server = await import("@/lib/auth/server");

    expect(server.getAuth).toBeTypeOf("function");
    expect(betterAuthMock).not.toHaveBeenCalled();
    expect(getPrismaClientMock).not.toHaveBeenCalled();
  });

  it("can be imported in production without Better Auth variables", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("BETTER_AUTH_URL", "");

    await expect(import("@/lib/auth/server")).resolves.toBeDefined();
    expect(betterAuthMock).not.toHaveBeenCalled();
  });

  it("fails safely only when production authentication is requested", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("BETTER_AUTH_URL", "");
    const { getAuth } = await import("@/lib/auth/server");

    expect(() => getAuth()).toThrowError(
      expect.objectContaining({ name: "AuthConfigurationError" }),
    );
    expect(betterAuthMock).not.toHaveBeenCalled();
    expect(getPrismaClientMock).not.toHaveBeenCalled();
  });

  it("keeps public signup disabled when authentication is created", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "configured-secret");
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example.test");
    betterAuthMock.mockReturnValue({ handler: vi.fn() });
    const { getAuth } = await import("@/lib/auth/server");

    getAuth();

    expect(betterAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAndPassword: expect.objectContaining({ enabled: true, disableSignUp: true }),
      }),
    );
  });
});
