import { writeFileSync } from "node:fs";

import { runPilotScenarios } from "../domains/pilot/scenario-runner";
import { SYNTHETIC_NOW } from "../domains/pilot/synthetic-data";
import { createCliPrismaClient } from "../lib/db/cli-client";

export async function main() {
  const prisma = createCliPrismaClient();
  const externalCalls = { count: 0 };
  try {
    const results = await runPilotScenarios({
      prisma,
      now: SYNTHETIC_NOW,
      externalCalls,
      env: process.env,
    });
    writeFileSync(
      process.env.SYNTHETIC_PILOT_RESULTS_FILE ?? "/tmp/flipschedule-pilot-results.json",
      JSON.stringify({ results, externalCallsAttempted: externalCalls.count }),
    );

    const failures = results
      .filter((result) => !result.passed)
      .map((result) => ({
        scenarioId: result.scenarioId,
        errorCode: result.errorCode ?? "CHECK_FAILED",
        failedChecks: result.checks
          .filter((item) => !item.passed)
          .map((item) => item.id),
      }));

    console.info(
      JSON.stringify({
        scenarioCount: results.length,
        passedCount: results.filter((result) => result.passed).length,
        externalCallsAttempted: externalCalls.count,
        failures,
      }),
    );
    if (failures.length > 0) process.exitCode = 1;
    return { results, externalCallsAttempted: externalCalls.count };
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    console.error("Cenários do ensaio técnico sintético falharam.");
    process.exitCode = 1;
  });
}
