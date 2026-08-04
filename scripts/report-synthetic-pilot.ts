import { appendFileSync, readFileSync } from "node:fs";

import {
  assertSanitizedReport,
  createSyntheticPilotReport,
  FINAL_MESSAGE,
} from "../domains/pilot/rehearsal-report";
import { assertManifestCommit, createReleaseManifest } from "../lib/runtime/release";

export function main() {
  if (process.env.REHEARSAL_GATES_PASSED !== "true") {
    throw new Error("REHEARSAL_GATES_NOT_COMPLETED");
  }

  const checkedOutSha = process.env.CHECKED_OUT_SHA ?? "";
  const migrationCount = Number(process.env.MIGRATION_COUNT);
  if (!Number.isInteger(migrationCount) || migrationCount < 0) {
    throw new Error("MIGRATION_COUNT_INVALID");
  }

  const manifest = createReleaseManifest({ ...process.env, BUILD_SHA: checkedOutSha });
  assertManifestCommit(manifest, checkedOutSha);
  const raw = JSON.parse(
    readFileSync(
      process.env.SYNTHETIC_PILOT_RESULTS_FILE ?? "/tmp/flipschedule-pilot-results.json",
      "utf8",
    ),
  );
  const startedAt = new Date(
    process.env.REHEARSAL_STARTED_AT ?? "2030-06-17T12:00:00.000Z",
  );
  const completedAt = new Date(
    process.env.REHEARSAL_COMPLETED_AT ?? startedAt.toISOString(),
  );
  const report = createSyntheticPilotReport({
    checkedOutSha,
    releaseId: manifest.releaseId,
    migrationsDigest: manifest.migrationsDigest,
    lockfileDigest: manifest.lockfileDigest,
    migrationCount,
    startedAt,
    completedAt,
    results: raw.results,
    externalCallsAttempted: raw.externalCallsAttempted,
  });
  assertSanitizedReport(report);
  console.info(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Ensaio técnico sintético do piloto\n- Cenários: ${report.scenarioCount}\n- Aprovados: ${report.passedCount}\n- Falhos: ${report.failedCount}\n- Bloqueados: ${report.blockedCount}\n- Chamadas externas: ${report.externalCallsAttempted}\n- Gates posteriores: aprovados\n\n${FINAL_MESSAGE}\n`,
    );
  }
  if (report.failedCount || report.blockedCount) process.exitCode = 1;
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch {
    console.error("Relatório sintético recusado ou falhou.");
    process.exitCode = 1;
  }
}
