import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

import {
  commercialCheckoutPolicySchema,
  readCommercialCheckoutPolicy,
  withCommercialCheckoutPolicy,
} from "@/domains/infrastructure/platform/commercial-checkout-policy";
import {
  mapCommercialPlanToBillingPlan,
  PrismaBillingPlanCatalog,
} from "@/domains/infrastructure/billing/commercial-billing-catalog";

const row = (overrides: Record<string, unknown> = {}) => ({
  code: "PRO",
  name: "Pro",
  status: "ACTIVE" as const,
  cycle: "MONTHLY" as const,
  priceCents: 19900,
  maxClinics: 3,
  maxUsers: 10,
  features: {
    checkout: {
      enabled: true,
      allowedBillingTypes: ["PIX", "CREDIT_CARD"],
      gracePeriodDays: 5,
    },
  },
  ...overrides,
});

describe("persisted commercial checkout policy", () => {
  it("fails closed when checkout metadata is absent or malformed", () => {
    expect(readCommercialCheckoutPolicy(null)).toEqual({ enabled: false, allowedBillingTypes: [], gracePeriodDays: null });
    expect(readCommercialCheckoutPolicy({ checkout: { enabled: true } })).toEqual({ enabled: false, allowedBillingTypes: [], gracePeriodDays: null });
  });

  it("preserves unrelated commercial features when writing checkout policy", () => {
    const result = withCommercialCheckoutPolicy(
      { entitlements: { whatsapp: true } },
      { enabled: true, allowedBillingTypes: ["PIX"], gracePeriodDays: 3 },
    ) as Record<string, unknown>;
    expect(result.entitlements).toEqual({ whatsapp: true });
    expect(result.checkout).toEqual({ enabled: true, allowedBillingTypes: ["PIX"], gracePeriodDays: 3 });
  });

  it("validates supported payment methods and bounded grace period", () => {
    expect(commercialCheckoutPolicySchema.safeParse({ enabled: true, allowedBillingTypes: ["PIX"], gracePeriodDays: 90 }).success).toBe(true);
    expect(commercialCheckoutPolicySchema.safeParse({ enabled: true, allowedBillingTypes: ["CRYPTO"], gracePeriodDays: 0 }).success).toBe(false);
    expect(commercialCheckoutPolicySchema.safeParse({ enabled: true, allowedBillingTypes: ["PIX"], gracePeriodDays: 91 }).success).toBe(false);
  });

  it("maps one checkout-ready commercial plan without changing price, cycle or limits", () => {
    expect(mapCommercialPlanToBillingPlan(row())).toMatchObject({
      code: "PRO",
      displayName: "Pro",
      priceCents: 19900,
      cycle: "MONTHLY",
      allowedBillingTypes: ["PIX", "CREDIT_CARD"],
      entitlementPolicy: { type: "PAID", gracePeriodDays: 5 },
      limits: { clinics: 3, users: 10 },
    });
  });

  it("never exposes inactive, custom, free or policy-disabled plans to recurring checkout", () => {
    expect(mapCommercialPlanToBillingPlan(row({ status: "INACTIVE" } as never))).toBeNull();
    expect(mapCommercialPlanToBillingPlan(row({ cycle: "CUSTOM" } as never))).toBeNull();
    expect(mapCommercialPlanToBillingPlan(row({ priceCents: 0 }))).toBeNull();
    expect(mapCommercialPlanToBillingPlan(row({ features: { checkout: { enabled: false, allowedBillingTypes: [], gracePeriodDays: null } } }))).toBeNull();
  });

  it("resolves checkout plans from CommercialPlan rows by exact code", async () => {
    const findUnique = vi.fn().mockResolvedValue(row());
    const findMany = vi.fn().mockResolvedValue([row(), row({ code: "OFF", status: "INACTIVE" } as never)]);
    const prisma = { commercialPlan: { findUnique, findMany } } as unknown as PrismaClient;
    const catalog = new PrismaBillingPlanCatalog(prisma);
    await expect(catalog.requireActive("PRO")).resolves.toMatchObject({ code: "PRO", priceCents: 19900 });
    await expect(catalog.listActive()).resolves.toHaveLength(1);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { code: "PRO" } }));
  });

  it("keeps provider execution separate while making runtime billing use the persistent source", () => {
    const billingService = readFileSync("domains/infrastructure/billing/billing-services.ts", "utf8");
    const page = readFileSync("app/(platform)/[tenantSlug]/configuracoes/assinatura/page.tsx", "utf8");
    const admin = readFileSync("app/(platform-admin)/admin/plans/actions.ts", "utf8");
    expect(billingService).toContain("BillingPlanSource");
    expect(billingService).toContain("await this.catalog.requireActive(planCode)");
    expect(page).toContain("new PrismaBillingPlanCatalog(prisma).listActive()");
    expect(page).toContain("Contratação online em preparação");
    expect(admin).toContain("PlatformCommercialCheckoutPolicyService");
  });
});
