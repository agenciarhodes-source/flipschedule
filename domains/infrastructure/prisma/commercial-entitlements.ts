import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  assertCommercialCapacity,
  assertCommercialPlanSupportsUsage,
  type CommercialPlanLimits,
} from "@/domains/application/billing/commercial-entitlements";

export type CommercialEntitlementTx = Pick<
  Prisma.TransactionClient,
  "subscription" | "clinic" | "membership" | "tenantInvitation"
>;

export interface EffectiveCommercialPlan extends CommercialPlanLimits {
  readonly id: string;
  readonly code: string;
}

export async function readEffectiveCommercialPlan(
  tx: CommercialEntitlementTx,
  tenantId: string,
): Promise<EffectiveCommercialPlan | null> {
  const subscription = await tx.subscription.findFirst({
    where: {
      tenantId,
      commercialPlanId: { not: null },
      status: { in: ["PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED"] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      commercialPlan: {
        select: { id: true, code: true, maxClinics: true, maxUsers: true },
      },
    },
  });

  return subscription?.commercialPlan ?? null;
}

export async function readCommercialUsage(tx: CommercialEntitlementTx, tenantId: string) {
  const [clinics, users] = await Promise.all([
    tx.clinic.count({ where: { tenantId, status: "ACTIVE" } }),
    tx.membership.count({ where: { tenantId, status: "ACTIVE" } }),
  ]);
  return { clinics, users } as const;
}

export async function assertTenantClinicCapacity(
  tx: CommercialEntitlementTx,
  tenantId: string,
  additional = 1,
) {
  const plan = await readEffectiveCommercialPlan(tx, tenantId);
  if (!plan || plan.maxClinics === null) return;
  const current = await tx.clinic.count({ where: { tenantId, status: "ACTIVE" } });
  assertCommercialCapacity({ resource: "clinics", limit: plan.maxClinics, current, additional });
}

export async function assertTenantUserCapacity(
  tx: CommercialEntitlementTx,
  tenantId: string,
  options: { reservePendingInvitations?: boolean; additional?: number; now?: Date } = {},
) {
  const plan = await readEffectiveCommercialPlan(tx, tenantId);
  if (!plan || plan.maxUsers === null) return;

  const reservePendingInvitations = options.reservePendingInvitations ?? false;
  const [activeUsers, pendingInvitations] = await Promise.all([
    tx.membership.count({ where: { tenantId, status: "ACTIVE" } }),
    reservePendingInvitations
      ? tx.tenantInvitation.count({
          where: {
            tenantId,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: options.now ?? new Date() },
          },
        })
      : Promise.resolve(0),
  ]);

  assertCommercialCapacity({
    resource: "users",
    limit: plan.maxUsers,
    current: activeUsers + pendingInvitations,
    additional: options.additional ?? 1,
  });
}

export async function assertPlanSupportsTenantUsage(
  tx: CommercialEntitlementTx,
  tenantId: string,
  limits: CommercialPlanLimits,
) {
  const usage = await readCommercialUsage(tx, tenantId);
  assertCommercialPlanSupportsUsage(limits, usage);
  return usage;
}
