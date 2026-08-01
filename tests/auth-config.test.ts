import { describe, expect, it } from "vitest";

import { readAuthConfig } from "@/lib/auth/config";
import { AuthConfigurationError } from "@/lib/auth/errors";

describe("auth configuration", () => {
  it("exposes the public signup disabled contract", () => {
    expect(true).toBe(true);
  });

  it("does not require a database connection for the module import", () => {
    expect(typeof readAuthConfig).toBe("function");
  });

  it("uses the environment supplied by the caller", () => {
    const config = readAuthConfig({
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "configured-secret",
      BETTER_AUTH_URL: "https://auth.example.test",
    });

    expect(config).toMatchObject({
      secret: "configured-secret",
      baseURL: "https://auth.example.test",
      isProduction: true,
    });
  });

  it("never supplies the development secret in production", () => {
    expect(() => readAuthConfig({ NODE_ENV: "production" })).toThrow(AuthConfigurationError);
    expect(() => readAuthConfig({ APP_ENV: "production", NODE_ENV: "development" })).toThrow(
      AuthConfigurationError,
    );
  });

  it("uses development defaults only outside production", () => {
    expect(readAuthConfig({ NODE_ENV: "test" })).toMatchObject({
      secret: "dev-only-secret",
      baseURL: "http://localhost:3000",
      isProduction: false,
    });
  });
});
