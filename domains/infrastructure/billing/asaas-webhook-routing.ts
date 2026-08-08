import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

type BillingRoutingHints = {
  authoritative: boolean;
  kind: "checkout" | "subscription" | "payment" | null;
  externalReference?: string;
  externalCheckoutId?: string;
  externalSubscriptionId?: string;
  externalPaymentId?: string;
};

function boundedIdentifier(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = String(value).trim();
  if (!normalized || normalized.length > 200) return undefined;
  return normalized;
}

export function readAsaasBillingRoutingHints(rawBody: Uint8Array): BillingRoutingHints {
  try {
    const payload = JSON.parse(new TextDecoder().decode(rawBody)) as Record<string, unknown>;
    const checkout = payload.checkout as Record<string, unknown> | undefined;
    if (checkout) {
      const externalCheckoutId = boundedIdentifier(checkout.id);
      const externalReference = boundedIdentifier(checkout.externalReference);
      if (externalCheckoutId || externalReference) {
        return {
          authoritative: true,
          kind: "checkout",
          ...(externalCheckoutId ? { externalCheckoutId } : {}),
          ...(externalReference ? { externalReference } : {}),
        };
      }
    }

    const subscription = payload.subscription as Record<string, unknown> | undefined;
    if (subscription) {
      const externalSubscriptionId = boundedIdentifier(subscription.id);
      const externalReference = boundedIdentifier(subscription.externalReference);
      if (externalSubscriptionId || externalReference) {
        return {
          authoritative: true,
          kind: "subscription",
          ...(externalSubscriptionId ? { externalSubscriptionId } : {}),
          ...(externalReference ? { externalReference } : {}),
        };
      }
    }

    const payment = payload.payment as Record<string, unknown> | undefined;
    if (payment) {
      const externalPaymentId = boundedIdentifier(payment.id);
      const externalSubscriptionId = boundedIdentifier(payment.subscription);
      if (externalPaymentId || externalSubscriptionId) {
        return {
          authoritative: true,
          kind: "payment",
          ...(externalPaymentId ? { externalPaymentId } : {}),
          ...(externalSubscriptionId ? { externalSubscriptionId } : {}),
        };
      }
    }
  } catch {
    return { authoritative: false, kind: null };
  }
  return { authoritative: false, kind: null };
}

export async function resolveAsaasBillingWebhookTenant(
  prisma: PrismaClient,
  rawBody: Uint8Array,
) {
  const hints = readAsaasBillingRoutingHints(rawBody);
  if (!hints.authoritative) {
    return { authoritative: false as const, tenantId: null, onboardingIntentId: null };
  }

  const tenantIds = new Set<string>();
  const onboarding = new Map<string, string | null>();
  const collect = (rows: readonly { tenantId: string }[]) => {
    for (const row of rows) tenantIds.add(row.tenantId);
  };
  const collectOnboarding = (rows: readonly { id: string; tenantId: string | null }[]) => {
    for (const row of rows) {
      onboarding.set(row.id, row.tenantId);
      if (row.tenantId) tenantIds.add(row.tenantId);
    }
  };

  if (hints.kind === "checkout") {
    const [rows, onboardingRows] = await Promise.all([
      prisma.billingCheckout.findMany({
        where: {
          provider: "ASAAS",
          OR: [
            ...(hints.externalCheckoutId ? [{ externalCheckoutId: hints.externalCheckoutId }] : []),
            ...(hints.externalReference ? [{ externalReference: hints.externalReference }] : []),
          ],
        },
        select: { tenantId: true },
        take: 2,
      }),
      prisma.commercialOnboardingIntent.findMany({
        where: {
          provider: "ASAAS",
          OR: [
            ...(hints.externalCheckoutId ? [{ externalCheckoutId: hints.externalCheckoutId }] : []),
            ...(hints.externalReference ? [{ externalReference: hints.externalReference }] : []),
          ],
        },
        select: { id: true, tenantId: true },
        take: 2,
      }),
    ]);
    collect(rows);
    collectOnboarding(onboardingRows);
  }

  if (hints.kind === "subscription") {
    const [subscriptions, checkouts, onboardingRows] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          provider: "ASAAS",
          OR: [
            ...(hints.externalSubscriptionId
              ? [{ externalSubscriptionId: hints.externalSubscriptionId }]
              : []),
            ...(hints.externalReference ? [{ externalReference: hints.externalReference }] : []),
          ],
        },
        select: { tenantId: true },
        take: 2,
      }),
      hints.externalReference
        ? prisma.billingCheckout.findMany({
            where: { provider: "ASAAS", externalReference: hints.externalReference },
            select: { tenantId: true },
            take: 2,
          })
        : Promise.resolve([]),
      prisma.commercialOnboardingIntent.findMany({
        where: {
          provider: "ASAAS",
          OR: [
            ...(hints.externalSubscriptionId
              ? [{ externalSubscriptionId: hints.externalSubscriptionId }]
              : []),
            ...(hints.externalReference ? [{ externalReference: hints.externalReference }] : []),
          ],
        },
        select: { id: true, tenantId: true },
        take: 2,
      }),
    ]);
    collect(subscriptions);
    collect(checkouts);
    collectOnboarding(onboardingRows);
  }

  if (hints.kind === "payment") {
    const [payments, subscriptions, onboardingRows] = await Promise.all([
      hints.externalPaymentId
        ? prisma.payment.findMany({
            where: { provider: "ASAAS", externalPaymentId: hints.externalPaymentId },
            select: { tenantId: true },
            take: 2,
          })
        : Promise.resolve([]),
      hints.externalSubscriptionId
        ? prisma.subscription.findMany({
            where: { provider: "ASAAS", externalSubscriptionId: hints.externalSubscriptionId },
            select: { tenantId: true },
            take: 2,
          })
        : Promise.resolve([]),
      prisma.commercialOnboardingIntent.findMany({
        where: {
          provider: "ASAAS",
          OR: [
            ...(hints.externalPaymentId ? [{ externalPaymentId: hints.externalPaymentId }] : []),
            ...(hints.externalSubscriptionId
              ? [{ externalSubscriptionId: hints.externalSubscriptionId }]
              : []),
          ],
        },
        select: { id: true, tenantId: true },
        take: 2,
      }),
    ]);
    collect(payments);
    collect(subscriptions);
    collectOnboarding(onboardingRows);
  }

  if (tenantIds.size > 1 || onboarding.size > 1) {
    return { authoritative: true as const, tenantId: null, onboardingIntentId: null };
  }

  const tenantId = tenantIds.size === 1 ? [...tenantIds][0]! : null;
  const onboardingEntry = onboarding.size === 1 ? [...onboarding.entries()][0]! : null;
  if (onboardingEntry) {
    const [onboardingIntentId, onboardingTenantId] = onboardingEntry;
    if (tenantId && onboardingTenantId !== tenantId) {
      return { authoritative: true as const, tenantId: null, onboardingIntentId: null };
    }
    return { authoritative: true as const, tenantId, onboardingIntentId };
  }

  return { authoritative: true as const, tenantId, onboardingIntentId: null };
}
