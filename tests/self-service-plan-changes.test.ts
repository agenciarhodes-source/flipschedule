import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { SubscriptionPlanChangeMetadata } from "@/domains/infrastructure/billing/plan-change-intent";
import {
  classifyProviderPlanState,
  restrictiveCommercialLimit,
} from "@/domains/infrastructure/billing/plan-change-intent";
import { AsaasWebhookAdapter } from "@/domains/infrastructure/billing/asaas-webhook-adapter";

const intent: SubscriptionPlanChangeMetadata = {
  currentPlanCode: "STARTER",
  currentCommercialPlanId: "11111111-1111-4111-8111-111111111111",
  currentPriceCents: 9900,
  currentCycle: "MONTHLY",
  currentMaxClinics: 1,
  currentMaxUsers: 3,
  targetPlanCode: "PRO",
  targetCommercialPlanId: "22222222-2222-4222-8222-222222222222",
  targetPriceCents: 19900,
  targetCycle: "MONTHLY",
  targetMaxClinics: 3,
  targetMaxUsers: 10,
  targetAllowedBillingTypes: ["PIX", "CREDIT_CARD"],
};

function planChangeServiceSource() {
  const source = readFileSync("domains/infrastructure/billing/billing-services.ts", "utf8");
  return (
    source.split("export class BillingSubscriptionPlanChangeService")[1]?.split(
      "export class BillingEntitlementService",
    )[0] ?? ""
  );
}

describe("self-service subscription plan changes", () => {
  it("holds the most restrictive quota while a plan change is unresolved", () => {
    expect(restrictiveCommercialLimit(null, 3)).toBe(3);
    expect(restrictiveCommercialLimit(3, null)).toBe(3);
    expect(restrictiveCommercialLimit(10, 3)).toBe(3);
    expect(restrictiveCommercialLimit(2, 5)).toBe(2);
    expect(restrictiveCommercialLimit(null, null)).toBeNull();
  });

  it("classifies authoritative provider state against immutable plan snapshots", () => {
    expect(
      classifyProviderPlanState(
        { id: "sub", status: "ACTIVE", valueCents: 9900, cycle: "MONTHLY" },
        intent,
      ),
    ).toBe("CURRENT");
    expect(
      classifyProviderPlanState(
        { id: "sub", status: "ACTIVE", valueCents: 19900, cycle: "MONTHLY" },
        intent,
      ),
    ).toBe("TARGET");
    expect(
      classifyProviderPlanState(
        { id: "sub", status: "ACTIVE", valueCents: 15900, cycle: "MONTHLY" },
        intent,
      ),
    ).toBe("AMBIGUOUS");
    expect(classifyProviderPlanState({ id: "sub", status: "ACTIVE" }, intent)).toBe(
      "INCOMPLETE",
    );
  });

  it("serializes one plan mutation, snapshots capacity and never creates a second subscription", () => {
    const section = planChangeServiceSource();
    expect(section).not.toBe("");
    expect(section).toContain("pg_advisory_xact_lock(350062");
    expect(section).toContain("lockCommercialQuota(tx, context.tenantId)");
    expect(section).toContain('requirePermission(context.membershipRole, "subscription.manage")');
    expect(section).toContain("PLAN_CHANGE_CONFIRMATION");
    expect(section).toContain("PLAN_CLINIC_LIMIT_BELOW_USAGE");
    expect(section).toContain("PLAN_USER_LIMIT_BELOW_USAGE");
    expect(section).toContain("PLAN_CHANGE_REQUESTED");
    expect(section).toContain("updatePendingPayments: true");
    expect(section).toContain("this.adapter.updateSubscription");
    expect(section).not.toContain("createRecurringCheckout");
    expect(section.indexOf("PLAN_CHANGE_REQUESTED")).toBeLessThan(
      section.indexOf("this.adapter.updateSubscription"),
    );
  });

  it("turns uncertain provider mutation results into reconciliation instead of blind retry", () => {
    const section = planChangeServiceSource();
    expect(section).not.toBe("");
    expect(section).toContain("PLAN_CHANGE_RECONCILIATION_REQUIRED");
    expect(section).toContain("markReconciliationRequired");
    expect(section).toContain("error instanceof BillingProviderError && !error.temporary");
    expect(section).toContain("PLAN_CHANGE_PROVIDER_REJECTED");
  });

  it("reconciles target/current provider states under the same quota lock", () => {
    const source = readFileSync(
      "domains/infrastructure/billing/reconciliation-service.ts",
      "utf8",
    );
    expect(source).toContain("pg_advisory_xact_lock(350062");
    expect(source).toContain("lockCommercialQuota(tx, tenantId)");
    expect(source).toContain("readPendingSubscriptionPlanChange");
    expect(source).toContain('planState === "TARGET"');
    expect(source).toContain('planState === "CURRENT"');
    expect(source).toContain("PLAN_CHANGE_RECONCILED");
    expect(source).toContain("PLAN_CHANGE_FAILED");
    expect(source).toContain("PLAN_CHANGE_PROVIDER_STATE_AMBIGUOUS");
  });

  it("reuses production billing gates and tenant allowlist for plan changes", () => {
    const runtime = readFileSync("domains/infrastructure/billing/asaas-runtime.ts", "utf8");
    expect(runtime).toContain("createAsaasBillingPlanChangeService");
    expect(runtime).toContain("new PrismaBillingPlanCatalog(prisma)");
    expect(runtime).toContain("ASAAS_PRODUCTION_EXTERNAL_EFFECT_SCOPE");
    expect(runtime).toContain("assertAsaasProductionTenantAllowed(context.tenantSlug, env)");
  });

  it("carries the real Asaas billing type instead of writing billing cycle into billingType", async () => {
    const rawBody = new TextEncoder().encode(
      JSON.stringify({
        id: "evt_1",
        event: "SUBSCRIPTION_UPDATED",
        subscription: {
          id: "sub_1",
          status: "ACTIVE",
          billingType: "CREDIT_CARD",
        },
      }),
    );
    const events = await new AsaasWebhookAdapter("secret").parseWebhook({
      provider: "ASAAS",
      headers: {},
      rawBody,
      receivedAt: new Date(),
      externalEventId: "evt_1",
      integrationExternalAccountId: "shared-billing",
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "BillingSubscriptionChanged",
      billingType: "CREDIT_CARD",
    });

    const runtime = readFileSync("domains/infrastructure/integrations/async-runtime.ts", "utf8");
    expect(runtime).not.toContain("billingType:checkout.cycle");
    expect(runtime).not.toContain("billingType: checkout.cycle");
    expect(runtime).toContain("billingType: event.billingType ?? null");
  });

  it("keeps the form tenant-scoped, OWNER-confirmed and capacity-aware", () => {
    const action = readFileSync(
      "app/(platform)/[tenantSlug]/configuracoes/assinatura/actions.ts",
      "utf8",
    );
    const page = readFileSync(
      "app/(platform)/[tenantSlug]/configuracoes/assinatura/page.tsx",
      "utf8",
    );
    expect(action).toContain("changeSubscriptionPlanAction");
    expect(action).toContain("tenantSlug !== context.tenantSlug");
    expect(action).toContain("createAsaasBillingPlanChangeService(getPrismaClient())");
    expect(page).toContain("PLAN_CHANGE_CONFIRMATION");
    expect(page).toContain("capacity.clinics.active <= clinicLimit");
    expect(page).toContain("capacity.users.reserved <= userLimit");
    expect(page).toContain("Somente o responsável OWNER");
    expect(page).toContain("Não é criada uma segunda assinatura");
  });
});
