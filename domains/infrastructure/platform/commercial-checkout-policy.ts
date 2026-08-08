import "server-only";

import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";

export const checkoutBillingTypeSchema = z.enum(["CREDIT_CARD", "PIX", "BOLETO"]);

export const commercialCheckoutPolicySchema = z.object({
  enabled: z.boolean(),
  allowedBillingTypes: z.array(checkoutBillingTypeSchema).max(3),
  gracePeriodDays: z.number().int().min(0).max(90).nullable(),
});

export type CommercialCheckoutPolicy = z.infer<typeof commercialCheckoutPolicySchema>;

const disabledPolicy: CommercialCheckoutPolicy = {
  enabled: false,
  allowedBillingTypes: [],
  gracePeriodDays: null,
};

function record(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

export function readCommercialCheckoutPolicy(features: Prisma.JsonValue | null | undefined): CommercialCheckoutPolicy {
  const checkout = record(features).checkout;
  const parsed = commercialCheckoutPolicySchema.safeParse(checkout);
  return parsed.success ? parsed.data : disabledPolicy;
}

export function withCommercialCheckoutPolicy(
  features: Prisma.JsonValue | null | undefined,
  policy: CommercialCheckoutPolicy,
): Prisma.InputJsonValue {
  return { ...record(features), checkout: policy } as Prisma.InputJsonValue;
}

export class PlatformCommercialCheckoutPolicyService {
  constructor(private readonly prisma: PrismaClient) {}

  async setPolicy(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.plans.manage");
    const data = z.object({
      planId: z.string().uuid(),
      enabled: z.boolean(),
      allowedBillingTypes: z.array(checkoutBillingTypeSchema).max(3),
      gracePeriodDays: z.number().int().min(0).max(90).nullable(),
    }).parse(input);

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.commercialPlan.findUnique({
        where: { id: data.planId },
        select: { id: true, code: true, cycle: true, priceCents: true, features: true },
      });
      if (!plan) throw new Error("PLAN_NOT_FOUND");
      if (data.enabled && plan.cycle === "CUSTOM") throw new Error("CHECKOUT_CYCLE_NOT_SUPPORTED");
      if (data.enabled && plan.priceCents <= 0) throw new Error("CHECKOUT_PRICE_REQUIRED");
      if (data.enabled && data.allowedBillingTypes.length === 0) throw new Error("CHECKOUT_BILLING_TYPE_REQUIRED");

      const policy: CommercialCheckoutPolicy = {
        enabled: data.enabled,
        allowedBillingTypes: data.enabled ? [...new Set(data.allowedBillingTypes)] : [],
        gracePeriodDays: data.enabled ? data.gracePeriodDays : null,
      };
      const updated = await tx.commercialPlan.update({
        where: { id: plan.id },
        data: { features: withCommercialCheckoutPolicy(plan.features, policy) },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.userId,
          action: "platform.plan.checkout_policy_changed",
          resourceType: "CommercialPlan",
          resourceId: plan.id,
          outcome: "SUCCESS",
          metadata: {
            code: plan.code,
            enabled: policy.enabled,
            allowedBillingTypes: policy.allowedBillingTypes,
            gracePeriodDays: policy.gracePeriodDays,
          },
        },
      });
      return updated;
    });
  }
}
