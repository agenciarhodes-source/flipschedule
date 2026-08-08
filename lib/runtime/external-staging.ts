import "server-only";

import { resolvePilotDataMode, type PilotDataMode } from "@/domains/pilot/data-policy";
import { getExternalEffectsMode, getRuntimeEnvironment } from "./config";
import { migrationsDigest } from "./release";

export interface ExternalStagingIdentity {
  environment: "staging";
  applicationHostname: string;
  databaseHostname: string;
  databaseName: string;
  releaseId: string;
  commitSha: string;
  migrationsDigest: string;
  externalEffectsMode: "DISABLED" | "SANDBOX";
  pilotMode: boolean;
  pilotDataMode: PilotDataMode;
}

const exactHost = (value: string | undefined, code: string) => {
  const host = value?.trim().toLowerCase();
  if (!host || host.includes(":") || host.includes("/") || host.includes("@")) throw new Error(code);
  return host;
};

export function resolveExternalStagingIdentity(
  env: Record<string, string | undefined> = process.env,
): ExternalStagingIdentity {
  if (getRuntimeEnvironment(env) !== "staging") throw new Error("EXTERNAL_STAGING_ONLY");

  const raw = env.STAGING_BASE_URL ?? env.NEXT_PUBLIC_APP_URL ?? "";
  let app: URL;
  let db: URL;
  try {
    app = new URL(raw);
    db = new URL(env.DATABASE_URL ?? "");
  } catch {
    throw new Error("EXTERNAL_STAGING_IDENTITY_INVALID");
  }

  if (
    app.protocol !== "https:" ||
    app.username ||
    app.password ||
    app.pathname !== "/" ||
    app.search ||
    app.hash
  ) {
    throw new Error("STAGING_URL_INVALID");
  }

  const allowed = exactHost(env.STAGING_ALLOWED_HOSTNAME, "STAGING_HOSTNAME_REQUIRED");
  const production = exactHost(env.PRODUCTION_HOSTNAME, "PRODUCTION_HOSTNAME_REQUIRED");
  const databaseHost = exactHost(
    env.STAGING_DATABASE_HOSTNAME,
    "STAGING_DATABASE_HOSTNAME_REQUIRED",
  );
  const databaseName = env.STAGING_DATABASE_NAME?.trim();
  if (!databaseName) throw new Error("STAGING_DATABASE_NAME_REQUIRED");

  if (app.hostname.toLowerCase() !== allowed || app.hostname.toLowerCase() === production) {
    throw new Error("STAGING_HOSTNAME_DENIED");
  }
  if (
    db.hostname.toLowerCase() !== databaseHost ||
    decodeURIComponent(db.pathname.slice(1)) !== databaseName
  ) {
    throw new Error("STAGING_DATABASE_IDENTITY_DENIED");
  }

  const commitSha = (env.BUILD_SHA ?? env.GITHUB_SHA ?? "").toLowerCase();
  const releaseId = env.RELEASE_ID?.trim() ?? "";
  if (!/^[a-f0-9]{40}$/.test(commitSha)) throw new Error("RELEASE_SHA_INVALID");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(releaseId)) {
    throw new Error("RELEASE_ID_INVALID");
  }

  const digest = env.MIGRATIONS_DIGEST ?? migrationsDigest();
  if (!/^[a-f0-9]{64}$/i.test(digest)) throw new Error("MIGRATIONS_DIGEST_INVALID");

  const externalEffectsMode = getExternalEffectsMode(env);
  if (externalEffectsMode === "PRODUCTION") throw new Error("STAGING_EXTERNAL_EFFECTS_INVALID");

  return {
    environment: "staging",
    applicationHostname: allowed,
    databaseHostname: databaseHost,
    databaseName,
    releaseId,
    commitSha,
    migrationsDigest: digest.toLowerCase(),
    externalEffectsMode,
    pilotMode: env.PILOT_MODE === "true",
    pilotDataMode: resolvePilotDataMode(env),
  };
}
