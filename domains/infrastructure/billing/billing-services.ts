import "server-only";

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import { requirePermission } from "@/domains/application/rbac";
import type { BillingPlanSource, BillingProviderAdapter, ProviderSubscription } from "@/domains/application/billing";
import { BillingProviderError } from "@/domains/application/billing";
import { assertExternalEffectAllowed } from "@/lib/runtime/external-effects";
import {
  lockCommercialQuota,
  readCommercialPlanCapacity,
} from "@/domains/infrastructure/prisma/commercial-plan-quota";
import {
  classifyProviderPlanState,
  PLAN_CHANGE_APPLIED,
  PLAN_CHANGE_FAILED,
  PLAN_CHANGE_RECONCILED,
  PLAN_CHANGE_RECONCILIATION_REQUIRED,
  PLAN_CHANGE_REQUESTED,
  readPendingSubscriptionPlanChange,
  type SubscriptionPlanChangeMetadata,
  writeSubscriptionPlanChangeAudit,
} from "./plan-change-intent";

const EFFECTIVE_SUBSCRIPTION_STATUSES = ["PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED"] as const;
const BLOCKING_CHECKOUT_STATUSES = ["CREATED", "ACTIVE", "PAID"] as const;

export type BillingCheckoutExecutionGuard = (context: ApplicationContext) => void;
export type BillingPlanChangeExecutionGuard = (context: ApplicationContext) => void;
export const PLAN_CHANGE_CONFIRMATION = "ALTERAR PLANO";

export class BillingCheckoutService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly catalog: BillingPlanSource,
    private readonly adapter: BillingProviderAdapter,
    private readonly appOrigin: string,
    private readonly providerEnvironment: "sandbox" | "production" = "sandbox",
    private readonly externalEffectsEnv: Record<string, string | undefined> = process.env,
    private readonly externalEffectsScope?: string,
    private readonly executionGuard?: BillingCheckoutExecutionGuard,
  ) {}

  async create(context: ApplicationContext, planCode: string) {
    assertExternalEffectAllowed(
      this.providerEnvironment,
      this.externalEffectsEnv,
      this.externalEffectsScope,
    );
    requirePermission(context.membershipRole, "billing.checkout");
    this.executionGuard?.(context);
    const plan = await this.catalog.requireActive(planCode);
    const correlationId = randomUUID();
    const externalReference = `fs_${randomUUID().replaceAll("-", "")}`;

    const reservation = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350061, hashtext(${context.tenantId}))`;

        const membership = await tx.membership.findFirst({
          where: { id: context.membershipId, tenantId: context.tenantId, status: "ACTIVE" },
          select: { id: true },
        });
        if (!membership) throw new Error("ACCESS_DENIED");

        const existingSubscription = await tx.subscription.findFirst({
          where: {
            tenantId: context.tenantId,
            status: { in: [...EFFECTIVE_SUBSCRIPTION_STATUSES] },
          },
          select: { id: true },
        });
        if (existingSubscription) throw new Error("SUBSCRIPTION_ALREADY_EXISTS");

        const existingCheckout = await tx.billingCheckout.findFirst({
          where: {
            tenantId: context.tenantId,
            provider: "ASAAS",
            status: { in: [...BLOCKING_CHECKOUT_STATUSES] },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            tenantId: true,
            planCode: true,
            status: true,
            externalCheckoutId: true,
            correlationId: true,
          },
        });
        if (existingCheckout) return { created: false as const, checkout: existingCheckout };

        const checkout = await tx.billingCheckout.create({
          data: {
            tenantId: context.tenantId,
            provider: "ASAAS",
            planCode: plan.code,
            externalReference,
            status: "CREATED",
            amountCents: plan.priceCents,
            cycle: plan.cycle,
            createdByMembershipId: context.membershipId,
            correlationId,
          },
        });
        return { created: true as const, checkout };
      },
      { isolationLevel: "Serializable" },
    );

    if (!reservation.created) {
      const existing = reservation.checkout;
      if (existing.planCode !== plan.code) throw new Error("CHECKOUT_ALREADY_ACTIVE_OTHER_PLAN");
      if (existing.status === "PAID") throw new Error("CHECKOUT_PAYMENT_PENDING_SYNC");
      if (existing.status === "CREATED") throw new Error("CHECKOUT_CREATION_IN_PROGRESS");
      if (!existing.externalCheckoutId) throw new Error("CHECKOUT_RECONCILIATION_REQUIRED");

      try {
        const hosted = await this.adapter.retrieveCheckout(
          existing.externalCheckoutId,
          existing.correlationId,
        );
        await this.audit(
          context,
          "billing.checkout.resumed",
          existing.id,
          existing.correlationId,
          "SUCCESS",
        );
        return { billingCheckoutId: existing.id, hostedCheckoutUrl: hosted.url, resumed: true };
      } catch (error) {
        if (error instanceof BillingProviderError) throw new Error("CHECKOUT_RESUME_FAILED");
        throw error;
      }
    }

    const checkout = reservation.checkout;
    const base = new URL(this.appOrigin);
    if (base.protocol !== "https:" && base.hostname !== "localhost") {
      throw new Error("INVALID_APPLICATION_ORIGIN");
    }
    const path = `/${encodeURIComponent(context.tenantSlug)}/configuracoes/assinatura/checkout`;

    let hosted;
    try {
      hosted = await this.adapter.createRecurringCheckout({
        externalReference,
        plan: {
          displayName: plan.displayName,
          priceCents: plan.priceCents,
          cycle: plan.cycle,
          allowedBillingTypes: plan.allowedBillingTypes,
        },
        nextDueDate: new Date().toISOString().slice(0, 10),
        callback: {
          successUrl: new URL(`${path}/sucesso`, base).toString(),
          cancelUrl: new URL(`${path}/cancelado`, base).toString(),
          expiredUrl: new URL(`${path}/expirado`, base).toString(),
        },
        correlationId,
      });
    } catch (error) {
      await this.prisma.billingCheckout.updateMany({
        where: { id: checkout.id, tenantId: context.tenantId, status: "CREATED" },
        data: { status: "FAILED" },
      });
      await this.audit(context, "billing.checkout.failed", checkout.id, correlationId, "FAILED");
      if (error instanceof BillingProviderError) throw new Error("CHECKOUT_CREATION_FAILED");
      throw error;
    }

    const updated = await this.prisma.billingCheckout.updateMany({
      where: { id: checkout.id, tenantId: context.tenantId, status: "CREATED" },
      data: {
        externalCheckoutId: hosted.id,
        status: "ACTIVE",
        ...(hosted.expiresAt ? { expiresAt: hosted.expiresAt } : {}),
      },
    });

    if (updated.count !== 1) {
      const persisted = await this.prisma.billingCheckout.findFirst({
        where: { id: checkout.id, tenantId: context.tenantId },
        select: { status: true, externalCheckoutId: true },
      });
      const webhookWonRace =
        persisted?.externalCheckoutId === hosted.id &&
        (persisted.status === "ACTIVE" || persisted.status === "PAID");
      if (!webhookWonRace) {
        await this.audit(
          context,
          "billing.checkout.reconciliation_required",
          checkout.id,
          correlationId,
          "FAILED",
        );
        throw new Error("CHECKOUT_RECONCILIATION_REQUIRED");
      }
    }

    await this.audit(context, "billing.checkout.created", checkout.id, correlationId, "SUCCESS");
    return { billingCheckoutId: checkout.id, hostedCheckoutUrl: hosted.url, resumed: false };
  }

  private audit(
    context: ApplicationContext,
    action: string,
    id: string,
    correlationId: string,
    outcome: "SUCCESS" | "FAILED",
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        action,
        resourceType: "BillingCheckout",
        resourceId: id,
        outcome,
        correlationId,
      },
    });
  }
}

export class BillingSubscriptionPlanChangeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly catalog: BillingPlanSource,
    private readonly adapter: BillingProviderAdapter,
    private readonly providerEnvironment: "sandbox" | "production" = "sandbox",
    private readonly externalEffectsEnv: Record<string, string | undefined> = process.env,
    private readonly externalEffectsScope?: string,
    private readonly executionGuard?: BillingPlanChangeExecutionGuard,
  ) {}

  async change(context: ApplicationContext, targetPlanCode: string, confirmation: string) {
    assertExternalEffectAllowed(
      this.providerEnvironment,
      this.externalEffectsEnv,
      this.externalEffectsScope,
    );
    requirePermission(context.membershipRole, "subscription.manage");
    if (context.membershipRole !== "OWNER" || confirmation !== PLAN_CHANGE_CONFIRMATION) {
      throw new Error("REAUTHENTICATION_REQUIRED");
    }
    this.executionGuard?.(context);

    const targetPlan = await this.catalog.requireActive(targetPlanCode);
    const correlationId = randomUUID();

    const reservation = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350062, hashtext(${context.tenantId}))`;
        await lockCommercialQuota(tx, context.tenantId);

        const membership = await tx.membership.findFirst({
          where: { id: context.membershipId, tenantId: context.tenantId, status: "ACTIVE" },
          select: { id: true },
        });
        if (!membership) throw new Error("ACCESS_DENIED");

        const subscription = await tx.subscription.findFirst({
          where: { tenantId: context.tenantId, provider: "ASAAS", status: "ACTIVE" },
          select: {
            id: true,
            planCode: true,
            commercialPlanId: true,
            externalSubscriptionId: true,
            cancelAtPeriodEnd: true,
          },
        });
        if (!subscription) throw new Error("SUBSCRIPTION_NOT_ACTIVE");
        if (!subscription.externalSubscriptionId || !subscription.commercialPlanId) {
          throw new Error("RECONCILIATION_REQUIRED");
        }
        if (subscription.cancelAtPeriodEnd) throw new Error("PLAN_CHANGE_CANCELLATION_PENDING");
        if (subscription.planCode === targetPlan.code) throw new Error("PLAN_ALREADY_ACTIVE");
        if (await readPendingSubscriptionPlanChange(tx, context.tenantId, subscription.id)) {
          throw new Error("PLAN_CHANGE_IN_PROGRESS");
        }

        const [currentPlan, targetRow, capacity] = await Promise.all([
          tx.commercialPlan.findUnique({
            where: { id: subscription.commercialPlanId },
            select: {
              id: true,
              code: true,
              status: true,
              cycle: true,
              priceCents: true,
              maxClinics: true,
              maxUsers: true,
            },
          }),
          tx.commercialPlan.findUnique({
            where: { code: targetPlan.code },
            select: {
              id: true,
              code: true,
              status: true,
              cycle: true,
              priceCents: true,
              maxClinics: true,
              maxUsers: true,
            },
          }),
          readCommercialPlanCapacity(tx, context.tenantId),
        ]);

        if (
          !currentPlan ||
          currentPlan.code !== subscription.planCode ||
          (currentPlan.cycle !== "MONTHLY" && currentPlan.cycle !== "YEARLY")
        ) {
          throw new Error("RECONCILIATION_REQUIRED");
        }
        if (
          !targetRow ||
          targetRow.status !== "ACTIVE" ||
          targetRow.priceCents !== targetPlan.priceCents ||
          targetRow.cycle !== targetPlan.cycle
        ) {
          throw new Error("PLAN_CHANGED_RETRY");
        }
        if (targetRow.maxClinics !== null && capacity.clinics.active > targetRow.maxClinics) {
          throw new Error("PLAN_CLINIC_LIMIT_BELOW_USAGE");
        }
        if (targetRow.maxUsers !== null && capacity.users.reserved > targetRow.maxUsers) {
          throw new Error("PLAN_USER_LIMIT_BELOW_USAGE");
        }

        const metadata: SubscriptionPlanChangeMetadata = {
          currentPlanCode: currentPlan.code,
          currentCommercialPlanId: currentPlan.id,
          currentPriceCents: currentPlan.priceCents,
          currentCycle: currentPlan.cycle,
          currentMaxClinics: currentPlan.maxClinics,
          currentMaxUsers: currentPlan.maxUsers,
          targetPlanCode: targetRow.code,
          targetCommercialPlanId: targetRow.id,
          targetPriceCents: targetRow.priceCents,
          targetCycle: targetPlan.cycle,
          targetMaxClinics: targetRow.maxClinics,
          targetMaxUsers: targetRow.maxUsers,
          targetAllowedBillingTypes: [...targetPlan.allowedBillingTypes],
        };

        await writeSubscriptionPlanChangeAudit(tx, {
          tenantId: context.tenantId,
          subscriptionId: subscription.id,
          correlationId,
          action: PLAN_CHANGE_REQUESTED,
          outcome: "SUCCESS",
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata,
        });

        return {
          subscriptionId: subscription.id,
          externalSubscriptionId: subscription.externalSubscriptionId,
          metadata,
          targetDisplayName: targetPlan.displayName,
        };
      },
      { isolationLevel: "Serializable" },
    );

    let providerCurrent: ProviderSubscription;
    try {
      providerCurrent = await this.adapter.retrieveSubscription(
        reservation.externalSubscriptionId,
        correlationId,
      );
    } catch {
      await this.closeIntent(context, reservation.subscriptionId, correlationId, PLAN_CHANGE_FAILED, {
        reasonCode: "PROVIDER_READ_FAILED",
      });
      throw new Error("PLAN_CHANGE_PROVIDER_UNAVAILABLE");
    }

    const initialState = classifyProviderPlanState(providerCurrent, reservation.metadata);
    if (initialState === "TARGET") {
      await this.applyTarget(
        context,
        reservation.subscriptionId,
        correlationId,
        reservation.metadata,
        providerCurrent,
        PLAN_CHANGE_RECONCILED,
      );
      return { subscriptionId: reservation.subscriptionId, planCode: reservation.metadata.targetPlanCode };
    }
    if (initialState !== "CURRENT") {
      await this.closeIntent(context, reservation.subscriptionId, correlationId, PLAN_CHANGE_FAILED, {
        reasonCode: "PROVIDER_STATE_DRIFT",
      });
      throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
    }
    if (
      !providerCurrent.billingType ||
      !reservation.metadata.targetAllowedBillingTypes.some(
        (type) => type === providerCurrent.billingType,
      )
    ) {
      await this.closeIntent(context, reservation.subscriptionId, correlationId, PLAN_CHANGE_FAILED, {
        reasonCode: "BILLING_TYPE_UNSUPPORTED",
      });
      throw new Error("PLAN_CHANGE_BILLING_TYPE_UNSUPPORTED");
    }

    let providerUpdated: ProviderSubscription;
    try {
      providerUpdated = await this.adapter.updateSubscription(
        reservation.externalSubscriptionId,
        {
          value: reservation.metadata.targetPriceCents / 100,
          cycle: reservation.metadata.targetCycle,
          description: reservation.targetDisplayName,
          updatePendingPayments: true,
        },
        correlationId,
      );
    } catch (error) {
      if (error instanceof BillingProviderError && !error.temporary) {
        await this.closeIntent(context, reservation.subscriptionId, correlationId, PLAN_CHANGE_FAILED, {
          reasonCode: error.code,
        });
        throw new Error("PLAN_CHANGE_PROVIDER_REJECTED");
      }
      await this.markReconciliationRequired(context, reservation.subscriptionId, correlationId);
      throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
    }

    if (classifyProviderPlanState(providerUpdated, reservation.metadata) !== "TARGET") {
      await this.markReconciliationRequired(context, reservation.subscriptionId, correlationId);
      throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
    }

    await this.applyTarget(
      context,
      reservation.subscriptionId,
      correlationId,
      reservation.metadata,
      providerUpdated,
      PLAN_CHANGE_APPLIED,
    );
    return { subscriptionId: reservation.subscriptionId, planCode: reservation.metadata.targetPlanCode };
  }

  private async applyTarget(
    context: ApplicationContext,
    subscriptionId: string,
    correlationId: string,
    metadata: SubscriptionPlanChangeMetadata,
    provider: ProviderSubscription,
    action: typeof PLAN_CHANGE_APPLIED | typeof PLAN_CHANGE_RECONCILED,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350062, hashtext(${context.tenantId}))`;
        await lockCommercialQuota(tx, context.tenantId);
        const pending = await readPendingSubscriptionPlanChange(tx, context.tenantId, subscriptionId);
        if (!pending || pending.correlationId !== correlationId) {
          throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
        }
        const updated = await tx.subscription.updateMany({
          where: {
            id: subscriptionId,
            tenantId: context.tenantId,
            provider: "ASAAS",
            planCode: metadata.currentPlanCode,
          },
          data: {
            planCode: metadata.targetPlanCode,
            commercialPlanId: metadata.targetCommercialPlanId,
            providerStatus: provider.status,
            ...(provider.billingType ? { billingType: provider.billingType } : {}),
            lastSyncedAt: new Date(),
          },
        });
        if (updated.count !== 1) throw new Error("PLAN_CHANGE_RECONCILIATION_REQUIRED");
        await writeSubscriptionPlanChangeAudit(tx, {
          tenantId: context.tenantId,
          subscriptionId,
          correlationId,
          action,
          outcome: "SUCCESS",
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            previousPlanCode: metadata.currentPlanCode,
            nextPlanCode: metadata.targetPlanCode,
            updatePendingPayments: true,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  }

  private async closeIntent(
    context: ApplicationContext,
    subscriptionId: string,
    correlationId: string,
    action: typeof PLAN_CHANGE_FAILED,
    metadata: Record<string, string>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(350062, hashtext(${context.tenantId}))`;
      const pending = await readPendingSubscriptionPlanChange(tx, context.tenantId, subscriptionId);
      if (!pending || pending.correlationId !== correlationId) return;
      await writeSubscriptionPlanChangeAudit(tx, {
        tenantId: context.tenantId,
        subscriptionId,
        correlationId,
        action,
        outcome: "FAILED",
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        metadata,
      });
    });
  }

  private async markReconciliationRequired(
    context: ApplicationContext,
    subscriptionId: string,
    correlationId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(350062, hashtext(${context.tenantId}))`;
      const pending = await readPendingSubscriptionPlanChange(tx, context.tenantId, subscriptionId);
      if (!pending || pending.correlationId !== correlationId) return;
      await writeSubscriptionPlanChangeAudit(tx, {
        tenantId: context.tenantId,
        subscriptionId,
        correlationId,
        action: PLAN_CHANGE_RECONCILIATION_REQUIRED,
        outcome: "FAILED",
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        metadata: { reasonCode: "PROVIDER_RESULT_UNCERTAIN" },
      });
    });
  }
}

export class BillingEntitlementService {
  constructor(private prisma: PrismaClient) {}
  async activatePaid(tenantId: string, subscriptionId: string, startsAt: Date, endsAt: Date | null) {
    return this.prisma.$transaction(
      async (tx) => {
        const protectedEntitlement = await tx.accessEntitlement.findFirst({
          where: { tenantId, type: { in: ["COURTESY", "INTERNAL"] }, status: "ACTIVE" },
          select: { id: true },
        });
        if (protectedEntitlement) return protectedEntitlement;
        const current = await tx.accessEntitlement.findFirst({
          where: { tenantId, type: "PAID", status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        });
        if (current) {
          return tx.accessEntitlement.update({
            where: { id: current.id },
            data: { startsAt, endsAt, reason: `SaaS subscription ${subscriptionId}` },
          });
        }
        return tx.accessEntitlement.create({
          data: {
            tenantId,
            type: "PAID",
            status: "ACTIVE",
            startsAt,
            endsAt,
            reason: `SaaS subscription ${subscriptionId}`,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  }
  async markPastDue(tenantId: string, subscriptionId: string) {
    return this.prisma.subscription.updateMany({
      where: { id: subscriptionId, tenantId, status: { in: ["PENDING", "ACTIVE", "PAST_DUE"] } },
      data: { status: "PAST_DUE", gracePeriodEndsAt: null },
    });
  }
}

export class BillingSubscriptionService {
  constructor(private prisma: PrismaClient, private adapter: BillingProviderAdapter) {}
  async setCancelAtPeriodEnd(context: ApplicationContext, enabled: boolean, confirmation: string) {
    requirePermission(context.membershipRole, "billing.cancel");
    if (context.membershipRole !== "OWNER" || confirmation !== "CANCELAR ASSINATURA") {
      throw new Error("REAUTHENTICATION_REQUIRED");
    }
    const row = await this.prisma.subscription.findFirst({
      where: {
        tenantId: context.tenantId,
        status: { in: ["ACTIVE", "PAST_DUE", "SUSPENDED"] },
      },
      select: { id: true, externalSubscriptionId: true, cancelAtPeriodEnd: true },
    });
    if (!row) throw new Error("SUBSCRIPTION_NOT_FOUND");
    if (row.cancelAtPeriodEnd === enabled) return row;
    if (!row.externalSubscriptionId) throw new Error("RECONCILIATION_REQUIRED");
    await this.adapter.updateSubscription(
      row.externalSubscriptionId,
      { cancelAtPeriodEnd: enabled },
      randomUUID(),
    );
    return this.prisma.subscription.update({
      where: { id: row.id },
      data: { cancelAtPeriodEnd: enabled, lastSyncedAt: new Date() },
    });
  }
}
