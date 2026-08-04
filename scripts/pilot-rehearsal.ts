import { execFileSync } from "node:child_process";

import { main as report } from "./report-synthetic-pilot";
import { main as run } from "./run-synthetic-pilot";
import { main as seed } from "./seed-synthetic-pilot";
import { main as verify } from "./verify-synthetic-pilot";

function checkedOutSha() {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("RELEASE_SHA_INVALID");
  return sha;
}

export async function main() {
  const startedAt = new Date().toISOString();
  const sha = checkedOutSha();
  process.env.CHECKED_OUT_SHA = sha;
  process.env.BUILD_SHA = sha;
  process.env.REHEARSAL_STARTED_AT = startedAt;

  await seed();
  await run();
  if (process.exitCode) throw new Error("SCENARIOS_FAILED");

  const verification = await verify();
  process.env.MIGRATION_COUNT = String(verification.migrationCount);
  process.env.REHEARSAL_COMPLETED_AT = new Date().toISOString();
  process.env.REHEARSAL_GATES_PASSED = "true";
  return report();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    console.error("Ensaio técnico sintético falhou.");
    process.exitCode = 1;
  });
}
