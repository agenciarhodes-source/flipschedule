import "server-only";

import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { ProviderEvent } from "@/domains/application/integrations";
import { ProviderPermanentError } from "@/domains/application/integrations";

export type CommercialOnboardingActivation = {
  onboardingIntentId: string;
  tenantId: string;
  userId: string;
  recipientEmail: string;
  workspaceName: string;
};

export type CommercialOnboardingApplyResult = {
  tenantId: string | null;
  applyToTenant: boolean;
  activation?: CommercialOnboardingActivation;
};

async function provisionPaidIntent(
  tx: Prisma.TransactionClient,
  intentId: string,
  now: Date,
): Promise<CommercialOnboardingActivation | null> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(350065, hashtext(${intentId}))`;
  const intent = await tx.commercialOnboardingIntent.findUnique({ where: { id: intentId } });
  if (!intent) throw new ProviderPermanentError("ONBOARDING_INTENT_UNRESOLVED");
  if (intent.status === "PROVISIONED") return null;
  if (intent.status !== "PAID") return null;

  const [plan, existingUser, existingTenant] = await Promise.all([
    tx.commercialPlan.findFirst({
      where: { id: intent.commercialPlanId, code: intent.planCode },
      select: { id: true, code: true },
    }),
    tx.user.findUnique({
      where: { emailNormalized: intent.ownerEmailNormalized },
      select: { id: true },
    }),
    tx.tenant.findUnique({ where: { slug: intent.tenantSlug }, select: { id: true } }),
  ]);

  if (!plan) {
    await tx.commercialOnboardingIntent.update({
      where: { id: intent.id },
      data: { lastErrorCode: "PROVISIONING_PLAN_UNRESOLVED" },
    });
    throw new ProviderPermanentError("PROVISIONING_PLAN_UNRESOLVED");
  }
  if (existingUser || existingTenant) {
    await tx.commercialOnboardingIntent.update({
      where: { id: intent.id },
      data: { lastErrorCode: "PROVISIONING_IDENTITY_CONFLICT" },
    });
    throw new ProviderPermanentError("PROVISIONING_IDENTITY_CONFLICT");
  }

  const tenant = await tx.tenant.create({
    data: {
      name: intent.tenantName,
      slug: intent.tenantSlug,
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
  });
  await tx.clinic.create({
    data: { tenantId: tenant.id, name: intent.tenantName, slug: "principal" },
  });
  const user = await tx.user.create({
    data: {
      emailNormalized: intent.ownerEmailNormalized,
      displayName: intent.ownerName,
      status: "ACTIVE",
      emailVerified: false,
      mustChangePassword: true,
    },
  });
  const membership = await tx.membership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
      acceptedAt: now,
    },
  });
  const inaccessiblePassword = `${randomBytes(48).toString("base64url")}!Aa1`;
  await tx.authAccount.create({
    data: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: await hashPassword(inaccessiblePassword),
    },
  });

  const checkout = await tx.billingCheckout.create({
    data: {
      tenantId: tenant.id,
      provider: "ASAAS",
      planCode: intent.planCode,
      externalReference: intent.externalReference,
      externalCheckoutId: intent.externalCheckoutId,
      status: "PAID",
      amountCents: intent.amountCents,
      cycle: intent.cycle,
      expiresAt: intent.expiresAt,
      completedAt: intent.paidAt ?? now,
      createdByMembershipId: membership.id,
      correlationId: intent.correlationId,
    },
  });

  let subscriptionId: string | null = null;
  if (intent.externalSubscriptionId) {
    const subscription = await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        commercialPlanId: intent.commercialPlanId,
        provider: "ASAAS",
        externalCustomerId: intent.externalCustomerId,
        externalSubscriptionId: intent.externalSubscriptionId,
        externalReference: intent.externalReference,
        planCode: intent.planCode,
        status: intent.subscriptionStatus ?? "PENDING",
        providerStatus: intent.providerStatus,
        billingType: intent.billingType,
        lastSyncedAt: now,
      },
      select: { id: true },
    });
    subscriptionId = subscription.id;
  }

  if (
    intent.externalPaymentId &&
    intent.paymentStatus &&
    intent.paymentAmountCents !== null &&
    intent.paymentDueAt
  ) {
    await tx.payment.create({
      data: {
        tenantId: tenant.id,
        subscriptionId,
        provider: "ASAAS",
        externalPaymentId: intent.externalPaymentId,
        status: intent.paymentStatus,
        providerStatus: intent.paymentStatus,
        amountCents: intent.paymentAmountCents,
        dueAt: intent.paymentDueAt,
        paidAt: intent.paymentPaidAt,
        lastSyncedAt: now,
        correlationId: intent.correlationId,
      },
    });

    if (intent.paymentStatus === "CONFIRMED" || intent.paymentStatus === "RECEIVED") {
      await tx.accessEntitlement.create({
        data: {
          tenantId: tenant.id,
          type: "PAID",
          status: "ACTIVE",
          startsAt: now,
          endsAt: null,
          reason: subscriptionId
            ? `SaaS subscription ${subscriptionId}`
            : `Commercial onboarding ${intent.id}`,
        },
      });
    }
  }

  await tx.commercialOnboardingIntent.update({
    where: { id: intent.id },
    data: {
      tenantId: tenant.id,
      status: "PROVISIONED",
      provisionedAt: now,
      lastErrorCode: null,
    },
  });
  await tx.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorUserId: user.id,
      actorMembershipId: membership.id,
      action: "commercial.onboarding.provisioned",
      resourceType: "CommercialOnboardingIntent",
      resourceId: intent.id,
      outcome: "SUCCESS",
      correlationId: intent.correlationId,
      metadata: {
        planCode: intent.planCode,
        billingCheckoutId: checkout.id,
        subscriptionMaterialized: Boolean(subscriptionId),
        paymentMaterialized: Boolean(intent.externalPaymentId),
      },
    },
  });

  return {
    onboardingIntentId: intent.id,
    tenantId: tenant.id,
    userId: user.id,
    recipientEmail: intent.ownerEmailNormalized,
    workspaceName: intent.tenantName,
  };
}

export async function applyCommercialOnboardingEvent(
  tx: Prisma.TransactionClient,
  onboardingIntentId: string,
  event: ProviderEvent,
  now: Date,
): Promise<CommercialOnboardingApplyResult> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(350065, hashtext(${onboardingIntentId}))`;
  const intent = await tx.commercialOnboardingIntent.findUnique({
    where: { id: onboardingIntentId },
  });
  if (!intent) throw new ProviderPermanentError("ONBOARDING_INTENT_UNRESOLVED");

  if (intent.status === "PROVISIONED") {
    if (!intent.tenantId) throw new ProviderPermanentError("ONBOARDING_TENANT_UNRESOLVED");
    return { tenantId: intent.tenantId, applyToTenant: true };
  }

  if (event.type === "BillingCheckoutChanged") {
    if (intent.externalCheckoutId && intent.externalCheckoutId !== event.externalCheckoutId) {
      throw new ProviderPermanentError("ONBOARDING_CHECKOUT_CONFLICT");
    }
    if (event.externalReference && event.externalReference !== intent.externalReference) {
      throw new ProviderPermanentError("ONBOARDING_REFERENCE_CONFLICT");
    }
    if (event.status === "CANCELLED" || event.status === "EXPIRED") {
      await tx.commercialOnboardingIntent.update({
        where: { id: intent.id },
        data: {
          externalCheckoutId: event.externalCheckoutId,
          status: event.status,
          providerStatus: event.status,
        },
      });
      return { tenantId: null, applyToTenant: false };
    }
    if (event.status === "ACTIVE") {
      await tx.commercialOnboardingIntent.update({
        where: { id: intent.id },
        data: {
          externalCheckoutId: event.externalCheckoutId,
          status: "CHECKOUT_ACTIVE",
          providerStatus: event.status,
          lastErrorCode: null,
        },
      });
      return { tenantId: null, applyToTenant: false };
    }

    await tx.commercialOnboardingIntent.update({
      where: { id: intent.id },
      data: {
        externalCheckoutId: event.externalCheckoutId,
        status: "PAID",
        providerStatus: event.status,
        paidAt: intent.paidAt ?? now,
        lastErrorCode: null,
      },
    });
    const activation = await provisionPaidIntent(tx, intent.id, now);
    const provisioned = await tx.commercialOnboardingIntent.findUnique({
      where: { id: intent.id },
      select: { tenantId: true },
    });
    if (!provisioned?.tenantId) throw new ProviderPermanentError("ONBOARDING_TENANT_UNRESOLVED");
    return {
      tenantId: provisioned.tenantId,
      applyToTenant: true,
      ...(activation ? { activation } : {}),
    };
  }

  if (event.type === "BillingSubscriptionChanged") {
    if (intent.externalSubscriptionId && intent.externalSubscriptionId !== event.externalSubscriptionId) {
      throw new ProviderPermanentError("ONBOARDING_SUBSCRIPTION_CONFLICT");
    }
    if (event.externalReference && event.externalReference !== intent.externalReference) {
      throw new ProviderPermanentError("ONBOARDING_REFERENCE_CONFLICT");
    }
    await tx.commercialOnboardingIntent.update({
      where: { id: intent.id },
      data: {
        externalSubscriptionId: event.externalSubscriptionId,
        externalCustomerId: event.externalCustomerId ?? intent.externalCustomerId,
        subscriptionStatus: event.status,
        providerStatus: event.providerStatus,
        billingType: event.billingType ?? intent.billingType,
      },
    });
    return { tenantId: null, applyToTenant: false };
  }

  if (event.type === "BillingPaymentChanged") {
    if (intent.externalPaymentId && intent.externalPaymentId !== event.externalPaymentId) {
      throw new ProviderPermanentError("ONBOARDING_PAYMENT_CONFLICT");
    }
    if (
      intent.externalSubscriptionId &&
      event.externalSubscriptionId &&
      intent.externalSubscriptionId !== event.externalSubscriptionId
    ) {
      throw new ProviderPermanentError("ONBOARDING_SUBSCRIPTION_CONFLICT");
    }
    await tx.commercialOnboardingIntent.update({
      where: { id: intent.id },
      data: {
        ...(event.externalSubscriptionId && !intent.externalSubscriptionId
          ? { externalSubscriptionId: event.externalSubscriptionId }
          : {}),
        externalPaymentId: event.externalPaymentId,
        paymentStatus: event.status,
        paymentAmountCents: event.amountCents,
        paymentDueAt: event.dueAt,
        paymentPaidAt: event.paidAt ?? null,
      },
    });
    return { tenantId: null, applyToTenant: false };
  }

  throw new ProviderPermanentError("ONBOARDING_EVENT_NOT_APPLICABLE");
}
