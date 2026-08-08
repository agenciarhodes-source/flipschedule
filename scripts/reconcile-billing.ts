import { randomUUID } from "node:crypto";
import { getPrismaClient } from "../lib/db";
import { createAsaasBillingReconciliationAdapter } from "../domains/infrastructure/billing/asaas-runtime";
import { AsaasBillingReconciliationService } from "../domains/infrastructure/billing/reconciliation-service";
import { assertSafeWorkerEnvironment } from "../domains/infrastructure/integrations/runtime-guard";
import { sanitizeErrorCode } from "../domains/application/platform/privacy";

export async function main(limit = 20) {
  assertSafeWorkerEnvironment();
  const prisma = getPrismaClient();
  const adapter = createAsaasBillingReconciliationAdapter();
  const reconciliation = new AsaasBillingReconciliationService(prisma, adapter);
  const rows = await prisma.subscription.findMany({
    where: {
      provider: "ASAAS",
      externalSubscriptionId: { not: null },
      status: { in: ["PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED"] },
    },
    select: { id: true, tenantId: true },
    take: Math.min(20, Math.max(1, limit)),
    orderBy: { updatedAt: "asc" },
  });

  let reconciled = 0;
  let failed = 0;
  const errors: { id: string; code: string }[] = [];

  for (const row of rows) {
    try {
      await reconciliation.reconcile(row.tenantId, row.id, randomUUID());
      reconciled++;
    } catch (error) {
      failed++;
      const code = sanitizeErrorCode(error instanceof Error ? error.message : undefined);
      errors.push({ id: row.id, code });
      await prisma.subscription.updateMany({
        where: { id: row.id, tenantId: row.tenantId },
        data: { lastSyncedAt: new Date() },
      });
    }
  }

  return { scanned: rows.length, reconciled, failed, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((result) => console.info(JSON.stringify(result)))
    .catch(() => {
      console.error("Reconciliação de billing falhou.");
      process.exitCode = 1;
    });
}
