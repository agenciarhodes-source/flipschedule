import { AuthConfigurationError } from "./errors";

export function readAuthConfig(environment: Record<string, string | undefined> = process.env) {
  const appEnv = environment.APP_ENV ?? environment.NODE_ENV ?? "development";
  const isProduction = appEnv === "production";
  const secret = environment.BETTER_AUTH_SECRET?.trim();
  const baseURL = environment.BETTER_AUTH_URL?.trim();
  const trustedOrigins = environment.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean);

  if (isProduction && (!secret || !baseURL)) {
    throw new AuthConfigurationError();
  }

  return {
    secret: secret ?? (isProduction ? undefined : "dev-only-secret"),
    baseURL: baseURL ?? (isProduction ? undefined : "http://localhost:3000"),
    trustedOrigins: trustedOrigins ?? [],
    isProduction,
  };
}
