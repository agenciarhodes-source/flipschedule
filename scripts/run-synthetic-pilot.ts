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
    console.info(JSON.stringify({
      scenarioCount: results.length,
      passedCount: results.filter((result) => result.passed).length,
      externalCallsAttempted: externalCalls.count,
    }));
    if (results.some((result) => !result.passed)) process.exitCode = 1;
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
