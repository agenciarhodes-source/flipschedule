import "server-only";

import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ProviderSubscription } from "@/domains/application/billing";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export const PLAN_CHANGE_REQUESTED = "billing.subscription.plan_change.requested";
export const PLAN_CHANGE_APPLIED = "billing.subscription.plan_change.applied";
export const PLAN_CHANGE_FAILED = "billing.subscription.plan_change.failed";
export const PLAN_CHANGE_RECONCILIATION_REQUIRED =
  "billing.subscription.plan_change.reconciliation_required";
export const PLAN_CHANGE_RECONCILED = "billing.subscription.plan_change.reconciled";

const planCycle = z.enum(["MONTHLY", "YEARLY"]);
const billingType = z.enum(["PIX", "CREDIT_CARD", "BOLETO"]);

export const subscriptionPlanChangeMetadataSchema = z.object({
  currentPlanCode: z.string().min(1),
  currentCommercialPlanId: z.string().uuid(),
  currentPriceCents: z.number().int().nonnegative(),
  currentCycle: planCycle,
  currentMaxClinics: z.number().int().nonnegative().nullable(),
  currentMaxUsers: z.number().int().nonnegative().nullable(),
  targetPlanCode: z.string().min(1),
  targetCommercialPlanId: z.string().uuid(),
  targetPriceCents: z.number().int().positive(),
  targetCycle: planCycle,
  targetMaxClinics: z.number().int().nonnegative().nullable(),
  targetMaxUsers: z.number().int().nonnegative().nullable(),
  targetAllowedBillingTypes: z.array(billingType).min(1),
});

export type SubscriptionPlanChangeMetadata = z.infer<typeof subscriptionPlanChangeMetadataSchema>;

export type PendingSubscriptionPlanChange = {
  correlationId: string;
  requestedAt: Date;
  metadata: SubscriptionPlanChangeMetadata;
};

const terminalActions = [PLAN_CHANGE_APPLIED, PLAN_CHANGE_FAILED, PLAN_CHANGE_RECONCILED] as const;

export function restrictiveCommercialLimit(current: number | null, pending: number | null) {
  if (current === null) return pending;
  if (pending === null) return current;
  return Math.min(current, pending);
}

export function classifyProviderPlanState(
  provider: ProviderSubscription,
  intent: SubscriptionPlanChangeMetadata,
): "CURRENT" | "TARGET" | "AMBIGUOUS" | "INCOMPLETE" {
  if (provider.valueCents === undefined || !provider.cycle) return "INCOMPLETE";
  const matchesCurrent =
    provider.valueCents === intent.currentPriceCents && provider.cycle === intent.currentCycle;
  const matchesTarget =
    provider.valueCents === intent.targetPriceCents && provider.cycle === intent.targetCycle;
  if (matchesTarget) return "TARGET";
  if (matchesCurrent) return "CURRENT";
  return "AMBIGUOUS";
}

export async function readPendingSubscriptionPlanChange(
  db: DatabaseClient,
  tenantId: string,
  subscriptionId: string,
): Promise<PendingSubscriptionPlanChange | null> {
  const requested = await db.auditLog.findFirst({
    where: {
      tenantId,
      resourceType: "Subscription",
      resourceId: subscriptionId,
      action: PLAN_CHANGE_REQUESTED,
    },
    orderBy: { occurredAt: "desc" },
    select: { correlationId: true, metadata: true, occurredAt: true },
  });
  if (!requested) return null;
  if (!requested.correlationId) throw new Error("PLAN_CHANGE_INTENT_INVALID");

  const terminal = await db.auditLog.findFirst({
    where: {
      tenantId,
      resourceType: "Subscription",
      resourceId: subscriptionId,
      correlationId: requested.correlationId,
      action: { in: [...terminalActions] },
    },
    select: { id: true },
  });
  if (terminal) return null;

  const metadata = subscriptionPlanChangeMetadataSchema.safeParse(requested.metadata);
  if (!metadata.success) throw new Error("PLAN_CHANGE_INTENT_INVALID");
  return {
    correlationId: requested.correlationId,
    requestedAt: requested.occurredAt,
    metadata: metadata.data,
  };
}

export function writeSubscriptionPlanChangeAudit(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    subscriptionId: string;
    correlationId: string;
    action: string;
    outcome: "SUCCESS" | "FAILED";
    actorUserId?: string | null;
    actorMembershipId?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      actorMembershipId: input.actorMembershipId ?? null,
      action: input.action,
      resourceType: "Subscription",
      resourceId: input.subscriptionId,
      outcome: input.outcome,
      correlationId: input.correlationId,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
}
