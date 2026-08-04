import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { createDatabaseFingerprint } from "../domains/backup-restore/fingerprint";
import { assertMatchingFingerprints, assertRehearsalEnvironment } from "../domains/backup-restore/rehearsal";
import { assertMigrationParity } from "./pilot-migration-count";
import { runPilotScenarios } from "../domains/pilot/scenario-runner";
import { SYNTHETIC_NOW } from "../domains/pilot/synthetic-data";

const client = (url: URL) => new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href }) });

export async function verifyBackupRestore(env = process.env) {
  const databases = assertRehearsalEnvironment(env);
  const source = client(databases.source.url), restore = client(databases.restore.url);
  try {
    await Promise.all([assertMigrationParity(source), assertMigrationParity(restore)]);
    const [sourceFingerprint, restoreFingerprint] = await Promise.all([createDatabaseFingerprint(source), createDatabaseFingerprint(restore)]);
    const fingerprintDigest = assertMatchingFingerprints(sourceFingerprint, restoreFingerprint);
    const externalCalls = { count: 0 };
    const results = await runPilotScenarios({ prisma: restore, now: SYNTHETIC_NOW, externalCalls, env });
    if (results.some((x) => x.status !== "PASSED") || externalCalls.count !== 0) throw new Error("RESTORED_SCENARIOS_FAILED");
    const sourceAfter = await createDatabaseFingerprint(source);
    if (assertMatchingFingerprints(sourceFingerprint, sourceAfter) !== fingerprintDigest) throw new Error("SOURCE_CHANGED");
    return { sourceFingerprint, restoreFingerprint, fingerprintDigest, verificationCount: results.reduce((sum, x) => sum + x.checks.length, 0), externalCallsAttempted: 0 };
  } finally { await Promise.allSettled([source.$disconnect(), restore.$disconnect()]); }
}

if (import.meta.url === `file://${process.argv[1]}`) verifyBackupRestore().then((x) => console.info(JSON.stringify({ fingerprintDigest: x.fingerprintDigest, verificationCount: x.verificationCount, externalCallsAttempted: 0 }))).catch(() => { console.error("Verificação pós-restore falhou."); process.exitCode = 1; });
