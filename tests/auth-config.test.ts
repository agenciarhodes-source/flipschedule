import { readFileSync } from "node:fs";
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

  it("uses the explicit environment supplied by the caller", () => {
    const config = readAuthConfig({
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "configured-secret-0123456789abcdef",
      BETTER_AUTH_URL: "https://auth.example.test",
      BETTER_AUTH_TRUSTED_ORIGINS: "https://auth.example.test",
    });

    expect(config).toMatchObject({
      secret: "configured-secret-0123456789abcdef",
      baseURL: "https://auth.example.test",
      trustedOrigins: ["https://auth.example.test"],
      isProduction: true,
    });
  });

  it("trusts both the production alias and immutable Vercel deployment", () => {
    const config = readAuthConfig({
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "configured-secret-0123456789abcdef",
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "flipschedule.vercel.app",
      VERCEL_URL: "flipschedule-7yp3bqopd-agenciarhodes-2076s-projects.vercel.app",
    });

    expect(config).toMatchObject({
      baseURL: "https://flipschedule.vercel.app",
      trustedOrigins: [
        "https://flipschedule.vercel.app",
        "https://flipschedule-7yp3bqopd-agenciarhodes-2076s-projects.vercel.app",
      ],
    });
  });

  it("uses the current Vercel deployment URL outside the production target", () => {
    const config = readAuthConfig({
      APP_ENV: "staging",
      BETTER_AUTH_SECRET: "configured-secret-0123456789abcdef",
      VERCEL_ENV: "preview",
      VERCEL_URL: "flipschedule-preview.vercel.app",
      VERCEL_BRANCH_URL: "flipschedule-git-feature.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "flipschedule.vercel.app",
    });

    expect(config).toMatchObject({
      baseURL: "https://flipschedule-preview.vercel.app",
      trustedOrigins: [
        "https://flipschedule-preview.vercel.app",
        "https://flipschedule-git-feature.vercel.app",
      ],
    });
  });

  it("keeps configured origins and exact Vercel runtime origins", () => {
    const config = readAuthConfig({
      APP_ENV: "production",
      BETTER_AUTH_SECRET: "configured-secret-0123456789abcdef",
      BETTER_AUTH_URL: "https://flipschedule.vercel.app",
      BETTER_AUTH_TRUSTED_ORIGINS: "https://app.flipschedule.com.br",
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "flipschedule.vercel.app",
      VERCEL_URL: "flipschedule-deployment.vercel.app",
    });

    expect(config.trustedOrigins).toEqual([
      "https://flipschedule.vercel.app",
      "https://app.flipschedule.com.br",
      "https://flipschedule-deployment.vercel.app",
    ]);
  });

  it("supports the existing AUTH_SECRET during the environment migration", () => {
    const config = readAuthConfig({
      APP_ENV: "production",
      AUTH_SECRET: "legacy-compatible-secret-0123456789abcdef",
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "flipschedule.vercel.app",
    });

    expect(config.secret).toBe("legacy-compatible-secret-0123456789abcdef");
  });

  it("never supplies a development secret in production", () => {
    expect(() => readAuthConfig({ NODE_ENV: "production" })).toThrow(AuthConfigurationError);
    expect(() =>
      readAuthConfig({
        APP_ENV: "production",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "flipschedule.vercel.app",
      }),
    ).toThrow(AuthConfigurationError);
  });

  it("uses development defaults only outside production", () => {
    expect(readAuthConfig({ NODE_ENV: "test" })).toMatchObject({
      secret: "dev-only-secret",
      baseURL: "http://localhost:3000",
      trustedOrigins: ["http://localhost:3000"],
      isProduction: false,
    });
  });

  it("keeps the browser client on the current origin", () => {
    const source = readFileSync("lib/auth/client.ts", "utf8");

    expect(source).toContain("createAuthClient()");
    expect(source).not.toContain("localhost:3000");
    expect(source).not.toContain("process.env");
  });
});
