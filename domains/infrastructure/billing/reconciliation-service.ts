import "server-only";

import type { PaymentStatus, Prisma, PrismaClient, SubscriptionStatus } from "@/generated/prisma/client";
import type { BillingProviderAdapter, ProviderPayment } from "@/domains/application/billing";
import { ProviderPermanentError } from "@/domains/application/integrations";
import { lockCommercialQuota } from "@/domains/infrastructure/prisma/commercial-plan-quota";
import { findCommercialPlanLink } from "./commercial-plan-link";
import {
  classifyProviderPlanState,
  PLAN_CHANGE_FAILED,
  PLAN_CHANGE_RECONCILED,
  readPendingSubscriptionPlanChange,
  writeSubscriptionPlanChangeAudit,
} from "./plan-change-intent";

const subscriptions: Readonly<Record<string, SubscriptionStatus>> = {
  ACTIVE: "ACTIVE",
  PENDING: "PENDING",
  OVERDUE: "PAST_DUE",
  INACTIVE: "SUSPENDED",
  EXPIRED: "EXPIRED",
  DELETED: "CANCELLED",
};
const payments: Readonly<Record<string, PaymentStatus>> = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  RECEIVED: "RECEIVED",
  OVERDUE: "OVERDUE",
  REFUNDED: "REFUNDED",
  DELETED: "CANCELLED",
  CANCELLED: "CANCELLED",
  CREDIT_CARD_CAPTURE_REFUSED: "FAILED",
};

export const mapAsaasSubscriptionStatus = (value: string) => subscriptions[value] ?? null;
export const mapAsaasPaymentStatus = (value: string) => payments[value] ?? null;

export class AsaasBillingReconciliationService {
  constructor(
    private prisma: PrismaClient,
    private adapter: BillingProviderAdapter,
  ) {}

  async reconcile(tenantId: string, subscriptionId: string, correlationId: string) {
    const local = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId, provider: "ASAAS" },
      select: {
        id: true,
        externalSubscriptionId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        planCode: true,
        commercialPlanId: true,
      },
    });
    if (!local?.externalSubscriptionId) throw new Error("RECONCILIATION_REQUIRED");

    const commercialPlan = local.commercialPlanId
      ? null
      : await findCommercialPlanLink(this.prisma, local.planCode);
    const result = await this.adapter.reconcileSubscription(
      local.externalSubscriptionId,
      correlationId,
    );
    const status = mapAsaasSubscriptionStatus(result.subscription.status);
    if (!status) {
      await this.prisma.subscription.updateMany({
        where: { id: local.id, tenantId },
        data: { providerStatus: result.subscription.status, lastSyncedAt: new Date() },
      });
      throw new ProviderPermanentError("UNKNOWN_SUBSCRIPTION_STATUS");
    }
    for (const item of result.payments) {
      if (!mapAsaasPaymentStatus(item.status)) {
        throw new ProviderPermanentError("UNKNOWN_PAYMENT_STATUS");
      }
    }

    const now = new Date();
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350062, hashtext(${tenantId}))`;
        await lockCommercialQuota(tx, tenantId);

        const pending = await readPendingSubscriptionPlanChange(tx, tenantId, local.id);
        const planState = pending
          ? classifyProviderPlanState(result.subscription, pending.metadata)
          : null;
        if (planState === "AMBIGUOUS" || planState === "INCOMPLETE") {
          throw new ProviderPermanentError("PLAN_CHANGE_PROVIDER_STATE_AMBIGUOUS");
        }

        const subscriptionPlanData =
          planState === "TARGET" && pending
            ? {
                planCode: pending.metadata.targetPlanCode,
                commercialPlanId: pending.metadata.targetCommercialPlanId,
              }
            : commercialPlan
              ? { commercialPlanId: commercialPlan.id }
              : {};

        await tx.subscription.updateMany({
          where: { id: local.id, tenantId },
          data: {
            providerStatus: result.subscription.status,
            status,
            ...subscriptionPlanData,
            ...(result.subscription.customerId
              ? { externalCustomerId: result.subscription.customerId }
              : {}),
            ...(result.subscription.billingType
              ? { billingType: result.subscription.billingType }
              : {}),
            lastSyncedAt: now,
          },
        });

        if (pending && planState === "TARGET") {
          await writeSubscriptionPlanChangeAudit(tx, {
            tenantId,
            subscriptionId: local.id,
            correlationId: pending.correlationId,
            action: PLAN_CHANGE_RECONCILED,
            outcome: "SUCCESS",
            metadata: {
              previousPlanCode: pending.metadata.currentPlanCode,
              nextPlanCode: pending.metadata.targetPlanCode,
              reconciliationCorrelationId: correlationId,
            },
          });
        } else if (pending && planState === "CURRENT") {
          await writeSubscriptionPlanChangeAudit(tx, {
            tenantId,
            subscriptionId: local.id,
            correlationId: pending.correlationId,
            action: PLAN_CHANGE_FAILED,
            outcome: "FAILED",
            metadata: {
              reasonCode: "PROVIDER_REMAINED_ON_CURRENT_PLAN",
              reconciliationCorrelationId: correlationId,
            },
          });
        }

        if (commercialPlan && !pending) {
          await tx.auditLog.create({
            data: {
              tenantId,
              action: "platform.billing.commercial_plan_linked",
              resourceType: "Subscription",
              resourceId: local.id,
              outcome: "SUCCESS",
              correlationId,
              metadata: { planCode: local.planCode, commercialPlanId: commercialPlan.id },
            },
          });
        }

        for (const item of result.payments) {
          await this.upsertPayment(tx, tenantId, local.id, item, correlationId, now);
        }
        if (
          result.payments.some((item) =>
            ["CONFIRMED", "RECEIVED"].includes(mapAsaasPaymentStatus(item.status) ?? ""),
          )
        ) {
          await this.activatePaid(
            tx,
            tenantId,
            local.id,
            local.currentPeriodStart ?? now,
            local.currentPeriodEnd,
          );
        }
        await tx.auditLog.create({
          data: {
            tenantId,
            action: "platform.billing.reconciled",
            resourceType: "Subscription",
            resourceId: local.id,
            outcome: "SUCCESS",
            correlationId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return { payments: result.payments.length };
  }

  private upsertPayment(
    prisma: Prisma.TransactionClient,
    tenantId: string,
    subscriptionId: string,
    item: ProviderPayment,
    correlationId: string,
    now: Date,
  ) {
    const status = mapAsaasPaymentStatus(item.status);
    if (!status) throw new ProviderPermanentError("UNKNOWN_PAYMENT_STATUS");
    return prisma.payment.upsert({
      where: {
        tenantId_provider_externalPaymentId: {
          tenantId,
          provider: "ASAAS",
          externalPaymentId: item.id,
        },
      },
      create: {
        tenantId,
        subscriptionId,
        provider: "ASAAS",
        externalPaymentId: item.id,
        status,
        providerStatus: item.status,
        amountCents: item.valueCents,
        dueAt: new Date(`${item.dueDate}T12:00:00Z`),
        paidAt: item.paymentDate ? new Date(`${item.paymentDate}T12:00:00Z`) : null,
        lastSyncedAt: now,
        correlationId,
      },
      update: {
        status,
        providerStatus: item.status,
        amountCents: item.valueCents,
        paidAt: item.paymentDate ? new Date(`${item.paymentDate}T12:00:00Z`) : null,
        lastSyncedAt: now,
        correlationId,
      },
    });
  }

  private async activatePaid(
    tx: Prisma.TransactionClient,
    tenantId: string,
    subscriptionId: string,
    startsAt: Date,
    endsAt: Date | null,
  ) {
    if (
      await tx.accessEntitlement.findFirst({
        where: { tenantId, type: { in: ["COURTESY", "INTERNAL"] }, status: "ACTIVE" },
        select: { id: true },
      })
    ) {
      return;
    }
    const current = await tx.accessEntitlement.findFirst({
      where: { tenantId, type: "PAID", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (current) {
      await tx.accessEntitlement.update({
        where: { id: current.id },
        data: { startsAt, endsAt, reason: `SaaS subscription ${subscriptionId}` },
      });
    } else {
      await tx.accessEntitlement.create({
        data: {
          tenantId,
          type: "PAID",
          status: "ACTIVE",
          startsAt,
          endsAt,
          reason: `SaaS subscription ${subscriptionId}`,
        },
      });
    }
  }
}
