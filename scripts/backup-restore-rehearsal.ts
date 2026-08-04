import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupPostgres } from "./ops-backup-postgres";
import { restorePostgres } from "./ops-restore-postgres";
import { verifyBackupRestore } from "./ops-verify-backup-restore";
import { BACKUP_FILE_NAME, assertRehearsalEnvironment } from "../domains/backup-restore/rehearsal";

export async function runBackupRestoreRehearsal(env = process.env) {
  assertRehearsalEnvironment(env);
  const directory = mkdtempSync(join(tmpdir(), "flipschedule-backup-restore-"));
  const dumpPath = join(directory, BACKUP_FILE_NAME);
  const statePath = env.BACKUP_RESTORE_STATE_PATH;
  try {
    const backup = await backupPostgres(directory, dumpPath, env);
    await restorePostgres(directory, dumpPath, env);
    const verification = await verifyBackupRestore(env);
    const state = { dumpChecksum: backup.checksumSha256, dumpSizeBytes: backup.sizeBytes, migrationCount: verification.sourceFingerprint.migrationCount, migrationDigest: verification.sourceFingerprint.migrationDigest, fingerprintDigest: verification.fingerprintDigest, verificationCount: verification.verificationCount, externalCallsAttempted: 0, restoreCompleted: true, verificationCompleted: true, fingerprintsMatch: true, sourcePreserved: true };
    if (statePath) writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
    return state;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) runBackupRestoreRehearsal().then((x) => console.info(JSON.stringify({ ...x, dumpRemoved: true }))).catch(() => { console.error("Ensaio descartável de backup/restore falhou."); process.exitCode = 1; });
