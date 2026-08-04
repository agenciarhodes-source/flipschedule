import { CONTROL_SLUG, PILOT_SLUG } from "../domains/pilot/synthetic-data";
import { createCliPrismaClient } from "../lib/db/cli-client";
import { assertMigrationParity } from "./pilot-migration-count";

export async function main() {
  const prisma = createCliPrismaClient();
  try {
    const migrationCount = await assertMigrationParity(prisma);
    const tenantCount = await prisma.tenant.count({
      where: { slug: { in: [PILOT_SLUG, CONTROL_SLUG] } },
    });
    const externalSent = await prisma.message.count({
      where: { direction: "OUTBOUND", status: "SENT" },
    });
    const checkouts = await prisma.billingCheckout.count();
    if (tenantCount !== 2 || externalSent || checkouts) {
      throw new Error("SYNTHETIC_PILOT_INTEGRITY_FAILED");
    }
    const result = {
      migrationCount,
      tenantCount,
      externalCallsAttempted: 0,
      integrity: true as const,
    };
    console.info(JSON.stringify(result));
    return result;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    console.error("Integridade do ensaio técnico sintético falhou.");
    process.exitCode = 1;
  });
}
