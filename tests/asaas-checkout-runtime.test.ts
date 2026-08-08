import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createAsaasBillingAdapter,
  getAsaasBillingEnvironment,
  isAsaasBillingCheckoutAvailable,
} from "@/domains/infrastructure/billing/asaas-runtime";
import { createProductionProviderRegistry } from "@/domains/infrastructure/integrations/production-registry";

const sandboxEnv = {
  APP_ENV: "test",
  ASAAS_ENVIRONMENT: "sandbox",
  ASAAS_API_KEY: "a".repeat(32),
  EXTERNAL_EFFECTS_MODE: "SANDBOX",
  PUBLIC_APP_ORIGIN: "https://app.example.test",
};

describe("controlled Asaas hosted checkout runtime", () => {
  it("is available only when sandbox effects and protected credentials are explicit", () => {
    expect(isAsaasBillingCheckoutAvailable(sandboxEnv)).toBe(true);
    expect(
      isAsaasBillingCheckoutAvailable({ ...sandboxEnv, EXTERNAL_EFFECTS_MODE: "DISABLED" }),
    ).toBe(false);
    expect(isAsaasBillingCheckoutAvailable({ ...sandboxEnv, ASAAS_API_KEY: "" })).toBe(false);
    expect(isAsaasBillingCheckoutAvailable({ ...sandboxEnv, ASAAS_ENVIRONMENT: "production" })).toBe(
      false,
    );
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
    expect(page).toContain("createHostedCheckoutAction");
    expect(page).toContain("isAsaasBillingCheckoutAvailable()");
    expect(page).toContain("Retomar checkout");
  });
});
