export type BillingCycle = "MONTHLY" | "YEARLY";
export type BillingType = "CREDIT_CARD" | "PIX" | "BOLETO";
export interface BillingPlan {
  readonly code: string;
  readonly displayName: string;
  readonly priceCents: number;
  readonly cycle: BillingCycle;
  readonly active: boolean;
  readonly allowedBillingTypes: readonly BillingType[];
  readonly entitlementPolicy: { readonly type: "PAID"; readonly gracePeriodDays: number | null };
  readonly limits: Readonly<Record<string, number>>;
  readonly version: number;
}

export class BillingPlanCatalog {
  private readonly plans: ReadonlyMap<string, BillingPlan>;
  constructor(plans: readonly BillingPlan[] = []) {
    for (const plan of plans) {
      if (!Number.isSafeInteger(plan.priceCents) || plan.priceCents < 0) throw new Error("INVALID_PLAN_PRICE");
      if (!plan.code || plan.version < 1) throw new Error("INVALID_PLAN");
    }
    this.plans = new Map(plans.map((plan) => [plan.code, Object.freeze({ ...plan })]));
  }
  find(code: string) { return this.plans.get(code) ?? null; }
  requireActive(code: string) {
    const plan = this.find(code);
    if (!plan?.active) throw new BillingPlanError("PLAN_NOT_AVAILABLE");
    return plan;
  }
  listActive() { return [...this.plans.values()].filter((plan) => plan.active); }
}
export class BillingPlanError extends Error { constructor(readonly code: "PLAN_NOT_AVAILABLE") { super(code); } }

/** Commercial names, prices, limits and grace period are not approved yet. */
export const billingPlanCatalog = new BillingPlanCatalog();
