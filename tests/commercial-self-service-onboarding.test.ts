import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("paid commercial self-service onboarding", () => {
  it("models onboarding as a durable pre-tenant intent with billing snapshots", () => {
    const schema = readFileSync("prisma/commercial-onboarding.prisma", "utf8");
    const migration = readFileSync(
      "prisma/migrations/20260808110000_add_commercial_onboarding/migration.sql",
      "utf8",
    );
    expect(schema).toContain("model CommercialOnboardingIntent");
    expect(schema).toContain("RECONCILIATION_REQUIRED");
    expect(schema).toContain("externalReference       String                     @unique");
    expect(schema).toContain("externalCheckoutId      String?                    @unique");
    expect(schema).toContain("externalSubscriptionId");
    expect(schema).toContain("externalPaymentId");
    expect(schema).toContain("publicTokenHash         String                     @unique");
    expect(migration).toContain('CREATE TABLE "CommercialOnboardingIntent"');
    expect(migration).toContain('"subscriptionStatus" "SubscriptionStatus"');
    expect(migration).toContain('"paymentStatus" "PaymentStatus"');
  });

  it("keeps tenant creation behind checkout PAID instead of public form submission", () => {
    const checkout = readFileSync(
      "domains/infrastructure/billing/commercial-onboarding-service.ts",
      "utf8",
    );
    const webhook = readFileSync(
      "domains/infrastructure/billing/commercial-onboarding-webhook.ts",
      "utf8",
    );
    expect(checkout).toContain("commercialOnboardingIntent.create");
    expect(checkout).not.toContain("tx.tenant.create");
    expect(checkout).not.toContain("tx.user.create");
    expect(webhook).toContain('event.status === "ACTIVE"');
    expect(webhook).toContain('status: "PAID"');
    expect(webhook).toContain("provisionPaidIntent(tx, intent.id, now)");
    expect(webhook.indexOf('status: "PAID"')).toBeLessThan(
      webhook.indexOf("provisionPaidIntent(tx, intent.id, now)"),
    );
  });

  it("serializes public purchase identity and persists intent before external checkout", () => {
    const source = readFileSync(
      "domains/infrastructure/billing/commercial-onboarding-service.ts",
      "utf8",
    );
    expect(source).toContain("pg_advisory_xact_lock(350063");
    expect(source).toContain("pg_advisory_xact_lock(350064");
    expect(source).toContain("DurableRateLimiter");
    expect(source).toContain("ONBOARDING_EMAIL_UNAVAILABLE");
    expect(source).toContain("ONBOARDING_SLUG_UNAVAILABLE");
    expect(source.indexOf("commercialOnboardingIntent.create")).toBeLessThan(
      source.indexOf("this.adapter.createRecurringCheckout"),
    );
    expect(source).toContain('status: "RECONCILIATION_REQUIRED"');
    expect(source).not.toContain("setTimeout(");
  });

  it("never retries an uncertain financial POST and can only resume a known checkout", () => {
    const source = readFileSync(
      "domains/infrastructure/billing/commercial-onboarding-service.ts",
      "utf8",
    );
    expect(source).toContain("PROVIDER_RESULT_UNCERTAIN");
    expect(source).toContain("ONBOARDING_RECONCILIATION_REQUIRED");
    expect(source).toContain("this.adapter.retrieveCheckout");
    expect(source).toContain('existingIntent.status === "CHECKOUT_ACTIVE"');
    expect(source).not.toContain("while (");
  });

  it("reuses controlled Asaas production gates and tenant allowlist", () => {
    const runtime = readFileSync(
      "domains/infrastructure/billing/commercial-onboarding-runtime.ts",
      "utf8",
    );
    expect(runtime).toContain("createAsaasBillingAdapter");
    expect(runtime).toContain("createAsaasBillingPlanSource");
    expect(runtime).toContain("getAsaasBillingEnvironment");
    expect(runtime).toContain("assertAsaasProductionTenantAllowed(tenantSlug, env)");
  });

  it("prefills only minimum customer data in hosted checkout", () => {
    const contract = readFileSync("domains/application/billing/provider-contract.ts", "utf8");
    const adapter = readFileSync(
      "domains/infrastructure/billing/asaas-billing-adapter.ts",
      "utf8",
    );
    const service = readFileSync(
      "domains/infrastructure/billing/commercial-onboarding-service.ts",
      "utf8",
    );
    expect(contract).toContain('customerData?: { name: string; email: string }');
    expect(service).toContain("customerData: { name: data.ownerName, email: data.ownerEmail }");
    expect(adapter).toContain("request.customerData?{customerData:request.customerData}:{}");
    expect(service).not.toContain("cpfCnpj");
    expect(service).not.toContain("creditCard");
  });

  it("routes known pre-tenant billing webhooks without falling back to an arbitrary integration", () => {
    const routing = readFileSync(
      "domains/infrastructure/billing/asaas-webhook-routing.ts",
      "utf8",
    );
    const ingress = readFileSync(
      "domains/infrastructure/integrations/webhook-ingress.ts",
      "utf8",
    );
    expect(routing).toContain("commercialOnboardingIntent.findMany");
    expect(routing).toContain("onboardingIntentId");
    expect(routing).toContain("tenantIds.size > 1 || onboarding.size > 1");
    expect(ingress).toContain("!billingRoute.tenantId && !billingRoute.onboardingIntentId");
    expect(ingress).toContain("tenantId = billingRoute.tenantId");
  });

  it("provisions tenant, primary clinic and OWNER atomically from paid intent", () => {
    const source = readFileSync(
      "domains/infrastructure/billing/commercial-onboarding-webhook.ts",
      "utf8",
    );
    expect(source).toContain("pg_advisory_xact_lock(350065");
    expect(source).toContain("tx.tenant.create");
    expect(source).toContain("tx.clinic.create");
    expect(source).toContain('slug: "principal"');
    expect(source).toContain("tx.user.create");
    expect(source).toContain('role: "OWNER"');
    expect(source).toContain("tx.authAccount.create");
    expect(source).toContain("randomBytes(48)");
    expect(source).toContain("tx.billingCheckout.create");
    expect(source).toContain('status: "PROVISIONED"');
    expect(source).toContain('action: "commercial.onboarding.provisioned"');
  });

  it("retains early subscription/payment events and hands off to tenant billing after provisioning", () => {
    const handler = readFileSync(
      "domains/infrastructure/billing/commercial-onboarding-webhook.ts",
      "utf8",
    );
    const runtime = readFileSync(
      "domains/infrastructure/integrations/async-runtime.ts",
      "utf8",
    );
    expect(handler).toContain("subscriptionStatus: event.status");
    expect(handler).toContain("externalPaymentId: event.externalPaymentId");
    expect(handler).toContain("paymentStatus: event.status");
    expect(handler).toContain("applyToTenant: true");
    expect(runtime).toContain("applyCommercialOnboardingEvent");
    expect(runtime).toContain("if (!onboarding.applyToTenant) return activation");
    expect(runtime).toContain("tenantId = onboarding.tenantId");
    expect(runtime).toContain("billing.webhook.subscription_applied");
    expect(runtime).toContain("billing.webhook.payment_applied");
  });

  it("delivers first access only after the provisioning transaction commits", () => {
    const runtime = readFileSync(
      "domains/infrastructure/integrations/async-runtime.ts",
      "utf8",
    );
    const transactionEnd = runtime.indexOf("      if (activation) {");
    const issue = runtime.indexOf("issueAccountActivation({");
    expect(transactionEnd).toBeGreaterThan(0);
    expect(issue).toBeGreaterThan(transactionEnd);
    expect(runtime).toContain("ACCOUNT_ACTIVATION_DELIVERY_UNAVAILABLE");
  });

  it("uses a one-time hashed activation token instead of emailing a temporary password", () => {
    const activation = readFileSync("lib/auth/account-activation/service.ts", "utf8");
    const email = readFileSync("lib/email/templates/account-activation.ts", "utf8");
    expect(activation).toContain('ACCOUNT_ACTIVATION_PURPOSE = "ACCOUNT_ACTIVATION"');
    expect(activation).toContain('return `act_${randomBytes(TOKEN_BYTES).toString("base64url")}`');
    expect(activation).toContain("hashAccountActivationToken");
    expect(activation).toContain("tokenHash");
    expect(activation).toContain("consumedAt: null");
    expect(activation).toContain("emailVerified: true");
    expect(activation).toContain("applyProvenPasswordChange");
    expect(email).toContain("Criar minha senha");
    expect(email).not.toContain("senha temporária");
  });

  it("keeps browser callbacks informational and server-authoritative", () => {
    const success = readFileSync("app/(public)/checkout/success/page.tsx", "utf8");
    const status = readFileSync(
      "components/public-routes/commercial-onboarding-status.tsx",
      "utf8",
    );
    expect(success).toContain("CommercialOnboardingStatus");
    expect(status).toContain("readCommercialOnboardingPublicStatus");
    expect(status).toContain("O acesso só será criado depois da confirmação financeira recebida pelo servidor");
    expect(success).not.toContain("provision");
    expect(success).not.toContain("payment.create");
  });
});
