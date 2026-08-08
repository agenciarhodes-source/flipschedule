import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import type { BillingPlanSource, BillingProviderAdapter } from "@/domains/application/billing";
import { BillingProviderError } from "@/domains/application/billing";
import { normalizeEmail } from "@/lib/auth/utils";
import { DurableRateLimiter, type RateLimitPolicy } from "@/lib/security/rate-limit";

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const commercialOnboardingSchema = z.object({
  planCode: z.string().trim().min(2).max(40).regex(/^[A-Z0-9]+(?:[_-][A-Z0-9]+)*$/),
  ownerEmail: z.string().trim().email().max(254).transform(normalizeEmail),
  ownerName: z.string().trim().min(2).max(120),
  tenantName: z.string().trim().min(2).max(120),
  tenantSlug: slugSchema,
});

const NON_TERMINAL = ["CREATED", "CHECKOUT_ACTIVE", "PAID", "RECONCILIATION_REQUIRED"] as const;
const requestByEmail: RateLimitPolicy = {
  scope: "commercial.onboarding.request.email",
  limit: 5,
  windowMs: 60 * 60 * 1000,
  blockMs: 60 * 60 * 1000,
};
const requestByIp: RateLimitPolicy = {
  scope: "commercial.onboarding.request.ip",
  limit: 30,
  windowMs: 60 * 60 * 1000,
  blockMs: 60 * 60 * 1000,
};

export type CommercialOnboardingExecutionGuard = (tenantSlug: string) => void;

export function generateCommercialOnboardingPublicToken() {
  return `onb_${randomBytes(32).toString("base64url")}`;
}

export function hashCommercialOnboardingPublicToken(token: string) {
  return createHash("sha256")
    .update(`commercial-onboarding-status\u001f${token}`, "utf8")
    .digest("hex");
}

export class CommercialOnboardingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly catalog: BillingPlanSource,
    private readonly adapter: BillingProviderAdapter,
    private readonly appOrigin: string,
    private readonly executionGuard?: CommercialOnboardingExecutionGuard,
  ) {}

  async create(input: unknown, identity: { ip?: string | null } = {}) {
    const data = commercialOnboardingSchema.parse(input);
    this.executionGuard?.(data.tenantSlug);
    const plan = await this.catalog.requireActive(data.planCode);

    const limiter = new DurableRateLimiter(this.prisma);
    const ip = identity.ip?.trim() || "unknown";
    const [emailLimit, ipLimit] = await Promise.all([
      limiter.consume([data.ownerEmail], requestByEmail),
      limiter.consume([ip], requestByIp),
    ]);
    if (!emailLimit.allowed || !ipLimit.allowed) throw new Error("ONBOARDING_RATE_LIMITED");

    const correlationId = randomUUID();
    const externalReference = `fso_${randomUUID().replaceAll("-", "")}`;
    const publicToken = generateCommercialOnboardingPublicToken();
    const publicTokenHash = hashCommercialOnboardingPublicToken(publicToken);

    const reservation = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350063, hashtext(${data.ownerEmail}))`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350064, hashtext(${data.tenantSlug}))`;

        const [existingUser, existingTenant, existingIntent] = await Promise.all([
          tx.user.findUnique({ where: { emailNormalized: data.ownerEmail }, select: { id: true } }),
          tx.tenant.findUnique({ where: { slug: data.tenantSlug }, select: { id: true } }),
          tx.commercialOnboardingIntent.findFirst({
            where: {
              status: { in: [...NON_TERMINAL] },
              OR: [
                { ownerEmailNormalized: data.ownerEmail },
                { tenantSlug: data.tenantSlug },
              ],
            },
            orderBy: { createdAt: "desc" },
          }),
        ]);
        if (existingUser) throw new Error("ONBOARDING_EMAIL_UNAVAILABLE");
        if (existingTenant) throw new Error("ONBOARDING_SLUG_UNAVAILABLE");

        if (existingIntent) {
          const sameRequest =
            existingIntent.ownerEmailNormalized === data.ownerEmail &&
            existingIntent.tenantSlug === data.tenantSlug &&
            existingIntent.planCode === plan.code;
          if (
            sameRequest &&
            existingIntent.status === "CHECKOUT_ACTIVE" &&
            existingIntent.externalCheckoutId
          ) {
            return {
              created: false as const,
              intent: await tx.commercialOnboardingIntent.update({
                where: { id: existingIntent.id },
                data: { publicTokenHash },
              }),
            };
          }
          if (existingIntent.status === "PAID") throw new Error("ONBOARDING_PAYMENT_PENDING_PROVISIONING");
          if (existingIntent.status === "RECONCILIATION_REQUIRED") {
            throw new Error("ONBOARDING_RECONCILIATION_REQUIRED");
          }
          throw new Error("ONBOARDING_ALREADY_ACTIVE");
        }

        const intent = await tx.commercialOnboardingIntent.create({
          data: {
            commercialPlanId: plan.code === data.planCode
              ? (await tx.commercialPlan.findUniqueOrThrow({ where: { code: plan.code }, select: { id: true } })).id
              : (await tx.commercialPlan.findUniqueOrThrow({ where: { code: data.planCode }, select: { id: true } })).id,
            planCode: plan.code,
            ownerEmailNormalized: data.ownerEmail,
            ownerName: data.ownerName,
            tenantName: data.tenantName,
            tenantSlug: data.tenantSlug,
            provider: "ASAAS",
            externalReference,
            amountCents: plan.priceCents,
            cycle: plan.cycle,
            status: "CREATED",
            correlationId,
            publicTokenHash,
          },
        });
        return { created: true as const, intent };
      },
      { isolationLevel: "Serializable" },
    );

    if (!reservation.created) {
      try {
        const hosted = await this.adapter.retrieveCheckout(
          reservation.intent.externalCheckoutId!,
          reservation.intent.correlationId,
        );
        return {
          onboardingId: reservation.intent.id,
          hostedCheckoutUrl: hosted.url,
          publicToken,
          resumed: true,
        };
      } catch (error) {
        if (error instanceof BillingProviderError) throw new Error("ONBOARDING_RESUME_FAILED");
        throw error;
      }
    }

    const base = new URL(this.appOrigin);
    if (base.protocol !== "https:" && base.hostname !== "localhost") {
      throw new Error("INVALID_APPLICATION_ORIGIN");
    }
    const callbackToken = encodeURIComponent(publicToken);

    try {
      const hosted = await this.adapter.createRecurringCheckout({
        externalReference: reservation.intent.externalReference,
        plan: {
          displayName: plan.displayName,
          priceCents: plan.priceCents,
          cycle: plan.cycle,
          allowedBillingTypes: plan.allowedBillingTypes,
        },
        customerData: { name: data.ownerName, email: data.ownerEmail },
        nextDueDate: new Date().toISOString().slice(0, 10),
        callback: {
          successUrl: new URL(`/checkout/success?token=${callbackToken}`, base).toString(),
          cancelUrl: new URL(`/checkout/cancelled?token=${callbackToken}`, base).toString(),
          expiredUrl: new URL(`/checkout/error?token=${callbackToken}`, base).toString(),
        },
        correlationId: reservation.intent.correlationId,
      });

      const updated = await this.prisma.commercialOnboardingIntent.updateMany({
        where: { id: reservation.intent.id, status: "CREATED" },
        data: {
          externalCheckoutId: hosted.id,
          status: "CHECKOUT_ACTIVE",
          providerStatus: hosted.status,
          ...(hosted.expiresAt ? { expiresAt: hosted.expiresAt } : {}),
          lastErrorCode: null,
        },
      });
      if (updated.count !== 1) throw new Error("ONBOARDING_RECONCILIATION_REQUIRED");

      return {
        onboardingId: reservation.intent.id,
        hostedCheckoutUrl: hosted.url,
        publicToken,
        resumed: false,
      };
    } catch (error) {
      const permanent = error instanceof BillingProviderError && !error.temporary;
      await this.prisma.commercialOnboardingIntent.updateMany({
        where: { id: reservation.intent.id, status: "CREATED" },
        data: permanent
          ? { status: "FAILED", lastErrorCode: error.code }
          : { status: "RECONCILIATION_REQUIRED", lastErrorCode: "PROVIDER_RESULT_UNCERTAIN" },
      });
      if (permanent) throw new Error("ONBOARDING_CHECKOUT_REJECTED");
      throw new Error("ONBOARDING_RECONCILIATION_REQUIRED");
    }
  }

  async readPublicStatus(token: string) {
    if (!token.startsWith("onb_") || token.length > 256) return null;
    const row = await this.prisma.commercialOnboardingIntent.findUnique({
      where: { publicTokenHash: hashCommercialOnboardingPublicToken(token) },
      select: { status: true, tenantSlug: true, accessSetupSentAt: true },
    });
    if (!row) return null;
    return {
      status: row.status,
      ready: row.status === "PROVISIONED",
      ...(row.status === "PROVISIONED" ? { tenantSlug: row.tenantSlug } : {}),
      accessSetupSent: Boolean(row.accessSetupSentAt),
    };
  }
}
