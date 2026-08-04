import { createCliPrismaClient } from "../lib/db/cli-client";
import { assertSyntheticPilotSeedEnvironment, seedSyntheticPilot } from "../domains/pilot/synthetic-data";

export async function main() {
  assertSyntheticPilotSeedEnvironment();
  const prisma = createCliPrismaClient();
  try {
    const result = await seedSyntheticPilot(prisma);
    console.info(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "SYNTHETIC_PILOT_SEED_FAILED";
    console.error(`Seed do ensaio técnico sintético falhou: ${code}`);
    process.exitCode = 1;
  });
}
