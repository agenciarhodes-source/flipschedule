import { createHash } from "node:crypto";
import { lstatSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

export const REHEARSAL_CONFIRMATION = "REHEARSE_DISPOSABLE_BACKUP_RESTORE";
export const REHEARSAL_DATABASE_ID = "DISPOSABLE_LOCAL_POSTGRES";
export const SOURCE_DATABASE = "flipschedule_backup_source";
export const RESTORE_DATABASE = "flipschedule_backup_restore";
export const BACKUP_FILE_NAME = "flipschedule-rehearsal.dump";
export const REHEARSAL_CONTRACT_VERSION = "1.0.0";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const DATABASES = new Set([SOURCE_DATABASE, RESTORE_DATABASE]);
const forbiddenOutput = /postgres(?:ql)?:\/\/|(?:password|secret|token|cookie)\s*[=:]|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+55\d{10,11}|\d{3}\.\d{3}\.\d{3}-\d{2}/i;

export type DisposableDatabase = { url: URL; database: string };
export type RehearsalEnvironment = {
  source: DisposableDatabase;
  restore: DisposableDatabase;
};

function parseDatabaseUrl(raw: string | undefined, expectedDatabase: string): DisposableDatabase {
  if (!raw) throw new Error("DATABASE_URL_REQUIRED");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("DATABASE_URL_INVALID"); }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") throw new Error("DATABASE_PROTOCOL_DENIED");
  if (!LOOPBACK_HOSTS.has(url.hostname)) throw new Error("DATABASE_HOST_DENIED");
  if (url.search || url.hash) throw new Error("DATABASE_URL_OPTIONS_DENIED");
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!DATABASES.has(database) || database !== expectedDatabase || !/^[a-z0-9_]+$/.test(database)) {
    throw new Error("DATABASE_NAME_DENIED");
  }
  return { url, database };
}

export function assertRehearsalEnvironment(env: Record<string, string | undefined>): RehearsalEnvironment {
  if (env.APP_ENV !== "staging") throw new Error("APP_ENV_DENIED");
  if (env.EXTERNAL_EFFECTS_MODE !== "DISABLED") throw new Error("EXTERNAL_EFFECTS_DENIED");
  if (env.BACKUP_RESTORE_CONFIRMATION !== REHEARSAL_CONFIRMATION) throw new Error("REHEARSAL_CONFIRMATION_REQUIRED");
  if (env.BACKUP_RESTORE_DATABASE_ID !== REHEARSAL_DATABASE_ID) throw new Error("REHEARSAL_DATABASE_ID_REQUIRED");
  if (env.SOURCE_DATABASE_URL && env.SOURCE_DATABASE_URL === env.RESTORE_DATABASE_URL) throw new Error("SOURCE_RESTORE_MUST_DIFFER");
  const source = parseDatabaseUrl(env.SOURCE_DATABASE_URL, SOURCE_DATABASE);
  const restore = parseDatabaseUrl(env.RESTORE_DATABASE_URL, RESTORE_DATABASE);
  if (source.url.href === restore.url.href || source.database === restore.database) throw new Error("SOURCE_RESTORE_MUST_DIFFER");
  if (source.url.hostname !== restore.url.hostname || source.url.port !== restore.url.port) throw new Error("DATABASE_SERVER_MISMATCH");
  return { source, restore };
}

export function assertSafeDumpPath(tempDirectory: string, dumpPath: string, mustExist = false) {
  if (basename(dumpPath) !== BACKUP_FILE_NAME || dumpPath.includes("..")) throw new Error("DUMP_PATH_DENIED");
  const root = realpathSync(tempDirectory);
  const parent = realpathSync(dirname(resolve(dumpPath)));
  if (parent !== root || resolve(dumpPath) !== resolve(root, BACKUP_FILE_NAME)) throw new Error("DUMP_PATH_DENIED");
  if (mustExist) {
    const link = lstatSync(dumpPath);
    if (link.isSymbolicLink() || realpathSync(dumpPath) !== resolve(root, BACKUP_FILE_NAME)) throw new Error("DUMP_SYMLINK_DENIED");
  }
  return resolve(root, BACKUP_FILE_NAME);
}

export function inspectDump(tempDirectory: string, dumpPath: string) {
  const safePath = assertSafeDumpPath(tempDirectory, dumpPath, true);
  const stats = statSync(safePath);
  if (!stats.isFile() || stats.size < 1) throw new Error("DUMP_EMPTY");
  if ((stats.mode & 0o077) !== 0) throw new Error("DUMP_PERMISSIONS_INVALID");
  return { path: safePath, sizeBytes: stats.size };
}

export function assertChecksum(checksum: string) {
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new Error("DUMP_CHECKSUM_INVALID");
}

export function assertSanitized(value: unknown) {
  if (forbiddenOutput.test(JSON.stringify(value))) throw new Error("SENSITIVE_OUTPUT_DENIED");
}

export function fingerprintDigest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function assertMatchingFingerprints(source: unknown, restored: unknown) {
  const sourceDigest = fingerprintDigest(source);
  const restoreDigest = fingerprintDigest(restored);
  if (sourceDigest !== restoreDigest) throw new Error("FINGERPRINT_MISMATCH");
  return sourceDigest;
}
