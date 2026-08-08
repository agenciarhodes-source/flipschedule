import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

import {
  createAsaasBillingAdapter,
  createAsaasBillingPlanSource,
  getAsaasBillingEnvironment,
  getAsaasCheckoutExpirationMinutes,
  isAsaasBillingCheckoutAvailable,
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
  it("is available only when sandbox effects and protected credentials are explicit", () => {
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

  it("refuses to construct a production billing environment", () => {
    expect(getAsaasBillingEnvironment(sandboxEnv)).toBe("sandbox");
    expect(() => getAsaasBillingEnvironment({ ...sandboxEnv, ASAAS_ENVIRONMENT: "production" })).toThrow(
      "A configuração operacional não está disponível",
    );
  });

  it("constructs the adapter without performing a network effect", () => {
    const fetchImpl = vi.fn();
    const adapter = createAsaasBillingAdapter(sandboxEnv, fetchImpl);
    expect(adapter.provider).toBe("ASAAS");
    expect(fetchImpl).not.toHaveBeenCalled();
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

  it("serializes checkout creation and blocks duplicate or unsynchronized attempts", () => {
    const service = readFileSync("domains/infrastructure/billing/billing-services.ts", "utf8");
    expect(service).toContain("pg_advisory_xact_lock(350061");
    expect(service).toContain('BLOCKING_CHECKOUT_STATUSES = ["CREATED", "ACTIVE", "PAID"]');
    expect(service).toContain("CHECKOUT_ALREADY_ACTIVE_OTHER_PLAN");
    expect(service).toContain("CHECKOUT_PAYMENT_PENDING_SYNC");
    expect(service).toContain("CHECKOUT_CREATION_IN_PROGRESS");
    expect(service).toContain("CHECKOUT_RECONCILIATION_REQUIRED");
    expect(service).toContain("this.adapter.retrieveCheckout");
  });

  it("persists the provider checkout id when a webhook wins the creation race", () => {
    const runtime = readFileSync("domains/infrastructure/integrations/async-runtime.ts", "utf8");
    expect(runtime).toContain(
      "data:{externalCheckoutId:event.externalCheckoutId,status:event.status",
    );
  });

  it("keeps the external redirect behind server context and provider validation", () => {
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
    expect(page).toContain("isAsaasBillingCheckoutAvailable()");
    expect(page).toContain("Retomar checkout");
  });
});
