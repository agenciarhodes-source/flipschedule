import { appendFileSync, readFileSync } from "node:fs";
import { assertSanitized } from "../domains/backup-restore/rehearsal";
import { SYNTHETIC_DATASET_VERSION } from "../domains/pilot/synthetic-data";
import packageJson from "../package.json" with { type: "json" };

const requiredGates = ["restore", "verification", "focused-tests", "lint", "typecheck", "build", "cleanup"] as const;
export function createBackupRestoreReport(env: Record<string, string | undefined>, state: Record<string, unknown>) {
  if (env.BACKUP_RESTORE_GATES_PASSED !== "true" || requiredGates.some((gate) => !env.BACKUP_RESTORE_PASSED_GATES?.split(",").includes(gate))) throw new Error("REPORT_GATES_INCOMPLETE");
  if (state.restoreCompleted !== true || state.verificationCompleted !== true || state.fingerprintsMatch !== true || state.sourcePreserved !== true) throw new Error("REPORT_STATE_INCOMPLETE");
  if (!/^[a-f0-9]{40}$/.test(env.CHECKED_OUT_SHA ?? "")) throw new Error("CHECKED_OUT_SHA_INVALID");
  const report = { result: "PASSED", checkedOutSha: env.CHECKED_OUT_SHA, applicationVersion: packageJson.version, migrationCount: state.migrationCount, migrationDigest: state.migrationDigest, syntheticDataset: SYNTHETIC_DATASET_VERSION, dumpChecksum: state.dumpChecksum, dumpSizeBytes: state.dumpSizeBytes, sourceAlias: "disposable-source", restoreAlias: "disposable-restore", verificationCount: state.verificationCount, fingerprintsMatch: state.fingerprintsMatch, sourcePreserved: state.sourcePreserved, dumpRemoved: true, externalCallsAttempted: 0, startedAt: env.BACKUP_RESTORE_STARTED_AT, completedAt: env.BACKUP_RESTORE_COMPLETED_AT };
  assertSanitized(report); return report;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.env.BACKUP_RESTORE_STATE_PATH;
  if (!path) throw new Error("REPORT_STATE_REQUIRED");
  try { const report=createBackupRestoreReport(process.env, JSON.parse(readFileSync(path,"utf8"))); console.info(JSON.stringify(report)); if(process.env.GITHUB_STEP_SUMMARY) writeFileSummary(process.env.GITHUB_STEP_SUMMARY, report); } catch { console.error("Relatório sanitizado indisponível."); process.exitCode=1; }
}
function writeFileSummary(path:string, report:Record<string,unknown>){ appendFileSync(path,`## Backup/restore descartável\n\n\`${JSON.stringify(report)}\`\n`); }
