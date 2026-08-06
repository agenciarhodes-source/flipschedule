import "server-only";

import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";

const uuidSchema = z.string().uuid();
const reasonSchema = z.string().trim().min(10).max(500);

export const changeManualSubscriptionStatusSchema = z.object({
  subscriptionId: uuidSchema,
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED"]),
  reason: reasonSchema,
  confirmation: z.string().default(""),
});

export class PlatformSubscriptionAdministrationService {
  constructor(private readonly prisma: PrismaClient) {}

  async changeManualStatus(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.subscriptions.manage");
    const data = changeManualSubscriptionStatusSchema.parse(input);
    if (data.status === "CANCELLED" && data.confirmation !== "CANCELAR ASSINATURA") {
      throw new Error("CONFIRMATION_REQUIRED");
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350053)`;
        const subscription = await tx.subscription.findUnique({
          where: { id: data.subscriptionId },
          select: {
            id: true,
            tenantId: true,
            provider: true,
            planCode: true,
            commercialPlanId: true,
            status: true,
            tenant: { select: { status: true } },
          },
        });
        if (!subscription) throw new Error("SUBSCRIPTION_NOT_FOUND");
        if (subscription.provider !== "MANUAL") {
          throw new Error("EXTERNAL_SUBSCRIPTION_READ_ONLY");
        }
        if (data.status === "ACTIVE" && subscription.tenant.status === "ARCHIVED") {
          throw new Error("ARCHIVED_TENANT_CANNOT_ACTIVATE");
        }

        const now = new Date();
        const updated = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: data.status,
            providerStatus: `MANUAL_${data.status}`,
            lastSyncedAt: now,
            cancelAtPeriodEnd: false,
            cancelledAt: data.status === "CANCELLED" ? now : null,
          },
        });

        let entitlementChangeCount = 0;
        if (data.status === "ACTIVE") {
          const existing = await tx.accessEntitlement.findFirst({
            where: {
              tenantId: subscription.tenantId,
              type: "PAID",
              status: "ACTIVE",
              OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            },
            select: { id: true },
          });
          if (!existing) {
            await tx.accessEntitlement.create({
              data: {
                tenantId: subscription.tenantId,
                type: "PAID",
                status: "ACTIVE",
                startsAt: now,
                endsAt: null,
                reason: `Assinatura manual ${subscription.planCode} reativada pela administração`,
                grantedByUserId: context.userId,
                metadata: {
                  subscriptionId: subscription.id,
                  planId: subscription.commercialPlanId,
                },
              },
            });
            entitlementChangeCount = 1;
          }
        } else {
          const revoked = await tx.accessEntitlement.updateMany({
            where: {
              tenantId: subscription.tenantId,
              type: "PAID",
              status: "ACTIVE",
            },
            data: { status: "REVOKED", revokedAt: now },
          });
          entitlementChangeCount = revoked.count;
        }

        await tx.auditLog.create({
          data: {
            tenantId: subscription.tenantId,
            actorUserId: context.userId,
            action:
              data.status === "ACTIVE"
                ? "platform.subscription.reactivated"
                : data.status === "SUSPENDED"
                  ? "platform.subscription.suspended"
                  : "platform.subscription.cancelled",
            resourceType: "Subscription",
            resourceId: subscription.id,
            outcome: "SUCCESS",
            metadata: {
              provider: subscription.provider,
              previousStatus: subscription.status,
              nextStatus: data.status,
              entitlementChangeCount,
              reasonCode: "OPERATOR_CONFIRMED",
            },
          },
        });

        return updated;
      },
      { isolationLevel: "Serializable" },
    );
  }
}
