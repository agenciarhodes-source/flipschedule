import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

import {
  ASAAS_PRODUCTION_CONFIRMATION,
  ASAAS_PRODUCTION_EXTERNAL_EFFECT_SCOPE,
  ASAAS_RECONCILIATION_EXTERNAL_EFFECT_SCOPE,
  assertAsaasProductionBillingReady,
  assertAsaasProductionTenantAllowed,
  createAsaasBillingAdapter,
  createAsaasBillingPlanSource,
  createAsaasBillingReconciliationAdapter,
  getAsaasBillingEnvironment,
  getAsaasCheckoutExpirationMinutes,
  getAsaasProductionBillingReadiness,
  isAsaasBillingCheckoutAvailable,
  isAsaasBillingCheckoutAvailableForTenant,
  isAsaasHostedCheckoutPlanSupported,
} from "@/domains/infrastructure/billing/asaas-runtime";
import { createProductionProviderRegistry } from "@/domains/infrastructure/integrations/production-registry";

const sandboxEnv = {
  APP_ENV: "test",
  ASAAS_ENVIRONMENT: "sandbox",
  ASAAS_API_KEY: "a".repeat(32),
  ASAAS_CHECKOUT_EXPIRATION_MINUTES: "60",
  EXTERNAL_EFFECTS_MODE: "SANDBOX",
  PUBLIC_APP_ORIGIN: "https://app.example.test",
};

const productionEnv = {
  APP_ENV: "production",
  ASAAS_ENVIRONMENT: "production",
  ASAAS_API_KEY: "p".repeat(32),
  ASAAS_CHECKOUT_EXPIRATION_MINUTES: "60",
  ASAAS_WEBHOOK_TOKEN: "w".repeat(32),
  EXTERNAL_EFFECTS_MODE: "PRODUCTION",
  EXTERNAL_EFFECTS_PRODUCTION_SCOPES: `${ASAAS_PRODUCTION_EXTERNAL_EFFECT_SCOPE},${ASAAS_RECONCILIATION_EXTERNAL_EFFECT_SCOPE}`,
  NEXT_PUBLIC_APP_URL: "https://app.flipschedule.com.br",
  PRODUCTION_HOSTNAME: "app.flipschedule.com.br",
  ASAAS_PRODUCTION_BILLING_ENABLED: "true",
  ASAAS_PRODUCTION_CONFIRMATION,
  ASAAS_PRODUCTION_TENANT_SLUGS: "pilot-clinic,second-clinic",
};

const commercialPlan = (allowedBillingTypes: string[]) => ({
  code: allowedBillingTypes.includes("BOLETO") ? "BOLETO_PLAN" : "PIX_PLAN",
  name: "Plano",
  status: "ACTIVE" as const,
  cycle: "MONTHLY" as const,
  priceCents: 9900,
  maxClinics: 1,
  maxUsers: 3,
  features: {
    checkout: { enabled: true, allowedBillingTypes, gracePeriodDays: null },
  },
});

describe("controlled Asaas hosted checkout runtime", () => {
  it("keeps sandbox available only with explicit sandbox effects and protected credentials", () => {
    expect(isAsaasBillingCheckoutAvailable(sandboxEnv)).toBe(true);
    expect(
      isAsaasBillingCheckoutAvailable({ ...sandboxEnv, EXTERNAL_EFFECTS_MODE: "DISABLED" }),
    ).toBe(false);
    expect(isAsaasBillingCheckoutAvailable({ ...sandboxEnv, ASAAS_API_KEY: "" })).toBe(false);
    expect(
      isAsaasBillingCheckoutAvailable({ ...sandboxEnv, ASAAS_CHECKOUT_EXPIRATION_MINUTES: "" }),
    ).toBe(false);
    expect(isAsaasBillingCheckoutAvailable({ ...sandboxEnv, ASAAS_ENVIRONMENT: "production" })).toBe(
      false,
    );
  });

  it("requires a bounded checkout expiration instead of inventing one", () => {
    expect(getAsaasCheckoutExpirationMinutes(sandboxEnv)).toBe(60);
    expect(() =>
      getAsaasCheckoutExpirationMinutes({ ...sandboxEnv, ASAAS_CHECKOUT_EXPIRATION_MINUTES: "9" }),
    ).toThrow("A configuração operacional não está disponível");
    expect(() =>
      getAsaasCheckoutExpirationMinutes({ ...sandboxEnv, ASAAS_CHECKOUT_EXPIRATION_MINUTES: "1441" }),
    ).toThrow("A configuração operacional não está disponível");
  });

  it("allows production provider selection only inside the production runtime", () => {
    expect(getAsaasBillingEnvironment(sandboxEnv)).toBe("sandbox");
    expect(getAsaasBillingEnvironment(productionEnv)).toBe("production");
    expect(() =>
      getAsaasBillingEnvironment({ ...productionEnv, APP_ENV: "staging" }),
    ).toThrow("A configuração operacional não está disponível");
  });

  it("requires every independent production billing gate", () => {
    expect(getAsaasProductionBillingReadiness(productionEnv)).toMatchObject({
      ready: true,
      runtimeEnvironment: "production",
      providerEnvironment: "production",
      externalEffectsMode: "PRODUCTION",
      productionCheckoutScopeEnabled: true,
      reconciliationScopeEnabled: true,
      billingEnabled: true,
      productionHostname: "app.flipschedule.com.br",
      tenantAllowlistCount: 2,
      checkoutExpirationMinutes: 60,
      apiKeyConfigured: true,
      webhookTokenConfigured: true,
      issues: [],
    });
    expect(() => assertAsaasProductionBillingReady(productionEnv)).not.toThrow();

    const disabledCases = [
      { ASAAS_PRODUCTION_BILLING_ENABLED: "false" },
      { ASAAS_PRODUCTION_CONFIRMATION: "" },
      { ASAAS_PRODUCTION_TENANT_SLUGS: "" },
      { ASAAS_PRODUCTION_TENANT_SLUGS: "*" },
      { ASAAS_WEBHOOK_TOKEN: "" },
      { ASAAS_API_KEY: "" },
      { EXTERNAL_EFFECTS_MODE: "DISABLED" },
      { EXTERNAL_EFFECTS_PRODUCTION_SCOPES: "" },
      { EXTERNAL_EFFECTS_PRODUCTION_SCOPES: ASAAS_PRODUCTION_EXTERNAL_EFFECT_SCOPE },
      { EXTERNAL_EFFECTS_PRODUCTION_SCOPES: ASAAS_RECONCILIATION_EXTERNAL_EFFECT_SCOPE },
      { ASAAS_ENVIRONMENT: "sandbox" },
      { PRODUCTION_HOSTNAME: "other.example.com" },
      { NEXT_PUBLIC_APP_URL: "https://other.example.com" },
    ];
    for (const override of disabledCases) {
      expect(isAsaasBillingCheckoutAvailable({ ...productionEnv, ...override })).toBe(false);
    }
  });

  it("keeps production rollout tenant-scoped on both readiness and execution guards", () => {
    expect(isAsaasBillingCheckoutAvailableForTenant("pilot-clinic", productionEnv)).toBe(true);
    expect(isAsaasBillingCheckoutAvailableForTenant("not-approved", productionEnv)).toBe(false);
    expect(() => assertAsaasProductionTenantAllowed("pilot-clinic", productionEnv)).not.toThrow();
    expect(() => assertAsaasProductionTenantAllowed("not-approved", productionEnv)).toThrow(
      "A configuração operacional não está disponível",
    );
  });

  it("keeps reconciliation available when new production billing is killed", () => {
    const fetchImpl = vi.fn();
    const reconciliationOnlyEnv = {
      ...productionEnv,
      ASAAS_PRODUCTION_BILLING_ENABLED: "false",
      ASAAS_PRODUCTION_CONFIRMATION: "",
      ASAAS_PRODUCTION_TENANT_SLUGS: "",
      ASAAS_WEBHOOK_TOKEN: "",
      ASAAS_CHECKOUT_EXPIRATION_MINUTES: "",
      EXTERNAL_EFFECTS_PRODUCTION_SCOPES: ASAAS_RECONCILIATION_EXTERNAL_EFFECT_SCOPE,
    };
    expect(isAsaasBillingCheckoutAvailable(reconciliationOnlyEnv)).toBe(false);
    expect(createAsaasBillingReconciliationAdapter(reconciliationOnlyEnv, fetchImpl).provider).toBe(
      "ASAAS",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never exposes production secrets through readiness output", () => {
    const serialized = JSON.stringify(getAsaasProductionBillingReadiness(productionEnv));
    expect(serialized).not.toContain(productionEnv.ASAAS_API_KEY);
    expect(serialized).not.toContain(productionEnv.ASAAS_WEBHOOK_TOKEN);
    expect(serialized).not.toContain(ASAAS_PRODUCTION_CONFIRMATION);
  });

  it("constructs sandbox and production adapters without performing a network effect", () => {
    const sandboxFetch = vi.fn();
    const productionFetch = vi.fn();
    expect(createAsaasBillingAdapter(sandboxEnv, sandboxFetch).provider).toBe("ASAAS");
    expect(createAsaasBillingAdapter(productionEnv, productionFetch).provider).toBe("ASAAS");
    expect(sandboxFetch).not.toHaveBeenCalled();
    expect(productionFetch).not.toHaveBeenCalled();
  });

  it("exposes only plans whose payment types are supported by Asaas hosted checkout", async () => {
    const supported = {
      code: "PIX_PLAN",
      displayName: "Plano",
      priceCents: 9900,
      cycle: "MONTHLY" as const,
      active: true,
      allowedBillingTypes: ["PIX"] as const,
      entitlementPolicy: { type: "PAID" as const, gracePeriodDays: null },
      limits: { clinics: 1, users: 3 },
      version: 1,
    };
    const unsupported = { ...supported, code: "BOLETO_PLAN", allowedBillingTypes: ["BOLETO"] as const };
    expect(isAsaasHostedCheckoutPlanSupported(supported)).toBe(true);
    expect(isAsaasHostedCheckoutPlanSupported(unsupported)).toBe(false);

    const prisma = {
      commercialPlan: {
        findMany: vi.fn().mockResolvedValue([commercialPlan(["PIX"]), commercialPlan(["BOLETO"])]),
        findUnique: vi.fn().mockResolvedValue(commercialPlan(["BOLETO"])),
      },
    } as unknown as PrismaClient;
    const source = createAsaasBillingPlanSource(prisma);
    await expect(source.listActive()).resolves.toHaveLength(1);
    await expect(source.requireActive("BOLETO_PLAN")).rejects.toThrow("PLAN_NOT_AVAILABLE");
  });

  it("rejects boleto at the adapter boundary before any network request", async () => {
    const fetchImpl = vi.fn();
    const adapter = createAsaasBillingAdapter(sandboxEnv, fetchImpl);
    await expect(
      adapter.createRecurringCheckout({
        externalReference: "fs_test",
        plan: {
          displayName: "Plano",
          priceCents: 9900,
          cycle: "MONTHLY",
          allowedBillingTypes: ["BOLETO"],
        },
        nextDueDate: "2026-08-08",
        callback: {
          successUrl: "https://app.example.test/success",
          cancelUrl: "https://app.example.test/cancel",
          expiredUrl: "https://app.example.test/expired",
        },
        correlationId: "test-correlation",
      }),
    ).rejects.toThrow("ASAAS_CHECKOUT_BILLING_TYPE_UNSUPPORTED");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accepts the canonical webhook token and the legacy protected alias", () => {
    expect(createProductionProviderRegistry({ ASAAS_WEBHOOK_TOKEN: "token" }).find("ASAAS")).not.toBeNull();
    expect(createProductionProviderRegistry({ ASAAS_WEBHOOK_SECRET: "legacy" }).find("ASAAS")).not.toBeNull();
    expect(createProductionProviderRegistry({}).find("ASAAS")).toBeNull();
  });

  it("serializes checkout creation and binds execution to the validated scoped runtime", () => {
    const service = readFileSync("domains/infrastructure/billing/billing-services.ts", "utf8");
    expect(service).toContain("pg_advisory_xact_lock(350061");
    expect(service).toContain('BLOCKING_CHECKOUT_STATUSES = ["CREATED", "ACTIVE", "PAID"]');
    expect(service).toContain("this.externalEffectsEnv");
    expect(service).toContain("this.externalEffectsScope");
    expect(service).toContain("this.executionGuard?.(context)");
    expect(service).toContain("CHECKOUT_ALREADY_ACTIVE_OTHER_PLAN");
    expect(service).toContain("CHECKOUT_PAYMENT_PENDING_SYNC");
    expect(service).toContain("CHECKOUT_CREATION_IN_PROGRESS");
    expect(service).toContain("CHECKOUT_RECONCILIATION_REQUIRED");
    expect(service).toContain("this.adapter.retrieveCheckout");
  });

  it("uses the shared billing credential and runtime for reconciliation", () => {
    const worker = readFileSync("scripts/reconcile-billing.ts", "utf8");
    expect(worker).toContain("createAsaasBillingReconciliationAdapter()");
    expect(worker).toContain("assertSafeWorkerEnvironment()");
    expect(worker).not.toContain("EnvironmentCredentialStore");
    expect(worker).not.toContain('environment:"sandbox"');
    expect(worker).not.toContain('environment: "sandbox"');
  });

  it("persists the provider checkout id when a webhook wins the creation race", () => {
    const runtime = readFileSync("domains/infrastructure/integrations/async-runtime.ts", "utf8");
    expect(runtime).toContain(
      "data:{externalCheckoutId:event.externalCheckoutId,status:event.status",
    );
  });

  it("keeps the external redirect behind tenant-aware server validation", () => {
    const action = readFileSync(
      "app/(platform)/[tenantSlug]/configuracoes/assinatura/actions.ts",
      "utf8",
    );
    const page = readFileSync(
      "app/(platform)/[tenantSlug]/configuracoes/assinatura/page.tsx",
      "utf8",
    );
    expect(action).toContain("tenantSlug !== context.tenantSlug");
    expect(action).toContain("createAsaasBillingCheckoutService(getPrismaClient())");
    expect(action).toContain("redirect(hostedCheckoutUrl)");
    expect(page).toContain("createAsaasBillingPlanSource(prisma).listActive()");
    expect(page).toContain("createHostedCheckoutAction");
    expect(page).toContain("isAsaasBillingCheckoutAvailableForTenant(context.tenantSlug)");
    expect(page).toContain("Retomar checkout");
  });
});
