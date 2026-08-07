import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { ProviderPermanentError } from "@/domains/application/integrations";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type CommercialPlanLink = {
  id: string;
  code: string;
};

/**
 * Resolve a persisted billing plan code to the canonical commercial plan.
 *
 * Existing subscriptions may legitimately keep an archived plan, so lifecycle
 * reconciliation must resolve by the immutable commercial code without
 * requiring the plan to remain available for new sales.
 */
export async function resolveCommercialPlanLink(
  db: DatabaseClient,
  planCode: string,
): Promise<CommercialPlanLink> {
  const plan = await db.commercialPlan.findUnique({
    where: { code: planCode },
    select: { id: true, code: true },
  });
  if (!plan) throw new ProviderPermanentError("COMMERCIAL_PLAN_UNRESOLVED");
  return plan;
}
