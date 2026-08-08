import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { BillingPlan, BillingPlanSource } from "@/domains/application/billing";
import { BillingPlanError } from "@/domains/application/billing";
import { readCommercialCheckoutPolicy } from "@/domains/infrastructure/platform/commercial-checkout-policy";

type CommercialPlanRow = {
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  cycle: "MONTHLY" | "YEARLY" | "CUSTOM";
  priceCents: number;
  maxClinics: number | null;
  maxUsers: number | null;
  features: Prisma.JsonValue | null;
};

export function mapCommercialPlanToBillingPlan(row: CommercialPlanRow): BillingPlan | null {
  const policy = readCommercialCheckoutPolicy(row.features);
  if (row.status !== "ACTIVE" || !policy.enabled) return null;
  if (row.cycle !== "MONTHLY" && row.cycle !== "YEARLY") return null;
  if (row.priceCents <= 0 || policy.allowedBillingTypes.length === 0) return null;

  return {
    code: row.code,
    displayName: row.name,
    priceCents: row.priceCents,
    cycle: row.cycle,
    active: true,
    allowedBillingTypes: policy.allowedBillingTypes,
    entitlementPolicy: { type: "PAID", gracePeriodDays: policy.gracePeriodDays },
    limits: {
      ...(row.maxClinics === null ? {} : { clinics: row.maxClinics }),
      ...(row.maxUsers === null ? {} : { users: row.maxUsers }),
    },
    version: 1,
  };
}

export class PrismaBillingPlanCatalog implements BillingPlanSource {
  constructor(private readonly prisma: PrismaClient) {}

  async listActive() {
    const plans = await this.prisma.commercialPlan.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ priceCents: "asc" }, { name: "asc" }],
      select: {
        code: true,
        name: true,
        status: true,
        cycle: true,
        priceCents: true,
        maxClinics: true,
        maxUsers: true,
        features: true,
      },
    });
    return plans.flatMap((plan) => {
      const mapped = mapCommercialPlanToBillingPlan(plan);
      return mapped ? [mapped] : [];
    });
  }

  async requireActive(code: string) {
    const row = await this.prisma.commercialPlan.findUnique({
      where: { code },
      select: {
        code: true,
        name: true,
        status: true,
        cycle: true,
        priceCents: true,
        maxClinics: true,
        maxUsers: true,
        features: true,
      },
    });
    const plan = row ? mapCommercialPlanToBillingPlan(row) : null;
    if (!plan) throw new BillingPlanError("PLAN_NOT_AVAILABLE");
    return plan;
  }
}
