import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { ProviderPermanentError } from "@/domains/application/integrations";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type CommercialPlanLink = {
  id: string;
  code: string;
};

/**
 * Find the canonical commercial plan for a persisted billing code.
 *
 * Existing subscriptions may legitimately keep an archived plan, so lifecycle
 * reconciliation resolves by the immutable commercial code without requiring
 * the plan to remain available for new sales.
 */
export function findCommercialPlanLink(
  db: DatabaseClient,
  planCode: string,
): Promise<CommercialPlanLink | null> {
  return db.commercialPlan.findUnique({
    where: { code: planCode },
    select: { id: true, code: true },
  });
}

/** New provider subscriptions must never materialize without a canonical managed plan. */
export async function requireCommercialPlanLink(
  db: DatabaseClient,
  planCode: string,
): Promise<CommercialPlanLink> {
  const plan = await findCommercialPlanLink(db, planCode);
  if (!plan) throw new ProviderPermanentError("COMMERCIAL_PLAN_UNRESOLVED");
  return plan;
}
