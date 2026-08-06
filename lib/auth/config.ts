import { getRuntimeEnvironment, isSecureRuntimeEnvironment } from "@/lib/runtime/environment";
import { AuthConfigurationError } from "./errors";

const forbiddenSecrets = new Set([
  "dev-only-secret",
  "change-me",
  "example-secret",
  "your-secret-here",
]);

type Environment = Record<string, string | undefined>;

function firstConfigured(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value));
}

function validateOrigin(raw: string, secure: boolean) {
  try {
    const url = new URL(raw);
    if (
      (secure && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      raw.includes("*") ||
      (secure && ["localhost", "127.0.0.1", "::1"].includes(url.hostname))
    ) {
      throw new Error("invalid origin");
    }
    return url.origin;
  } catch {
    throw new AuthConfigurationError();
  }
}

function asHttpsOrigin(host: string | undefined) {
  const value = host?.trim();
  if (!value) return undefined;
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

function resolveVercelOrigins(env: Environment) {
  const productionOrigin = asHttpsOrigin(env.VERCEL_PROJECT_PRODUCTION_URL);
  const deploymentOrigin = asHttpsOrigin(env.VERCEL_URL);
  const branchOrigin = asHttpsOrigin(env.VERCEL_BRANCH_URL);

  return env.VERCEL_ENV === "production"
    ? [productionOrigin, deploymentOrigin]
    : [deploymentOrigin, branchOrigin];
}

function resolveVercelOrigin(env: Environment) {
  return resolveVercelOrigins(env).find((value): value is string => Boolean(value));
}

export function resolveAuthBaseURL(env: Environment, secure: boolean) {
  const raw = firstConfigured(
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.PUBLIC_APP_ORIGIN,
    resolveVercelOrigin(env),
  );

  return validateOrigin(raw ?? "http://localhost:3000", secure);
}

export function readAuthConfig(env: Environment = process.env) {
  const runtime = getRuntimeEnvironment(env);
  const isSecureRuntime = isSecureRuntimeEnvironment(env);
  const secret = firstConfigured(env.BETTER_AUTH_SECRET, env.AUTH_SECRET);

  if (
    isSecureRuntime &&
    (!secret ||
      secret.length < 32 ||
      forbiddenSecrets.has(secret.toLowerCase()) ||
      secret === env.FIELD_ENCRYPTION_KEY?.trim() ||
      secret === env.RATE_LIMIT_HASH_KEY?.trim())
  ) {
    throw new AuthConfigurationError();
  }

  const baseURL = resolveAuthBaseURL(env, isSecureRuntime);
  const configuredOrigins =
    env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [];
  const runtimeOrigins = resolveVercelOrigins(env).filter(
    (value): value is string => Boolean(value),
  );
  const trustedOrigins = [
    ...new Set(
      [baseURL, ...configuredOrigins, ...runtimeOrigins].map((value) =>
        validateOrigin(value, isSecureRuntime),
      ),
    ),
  ];

  if (isSecureRuntime && !trustedOrigins.includes(baseURL)) {
    throw new AuthConfigurationError();
  }

  return {
    secret: secret ?? "dev-only-secret",
    baseURL,
    trustedOrigins,
    isProduction: runtime === "production",
    isSecureRuntime,
  };
}
