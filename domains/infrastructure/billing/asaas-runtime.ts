import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  BillingPlanError,
  type BillingPlan,
  type BillingPlanSource,
} from "@/domains/application/billing";
import type { FetchLike, AsaasEnvironment } from "./asaas-http-client";
import { AsaasBillingAdapter } from "./asaas-billing-adapter";
import { AsaasHttpClient } from "./asaas-http-client";
import { BillingCheckoutService } from "./billing-services";
import { PrismaBillingPlanCatalog } from "./commercial-billing-catalog";
import { assertExternalEffectAllowed } from "@/lib/runtime/external-effects";
import {
  getExternalEffectsMode,
  getPublicApplicationOrigin,
  getRuntimeEnvironment,
  requireRuntimeSecretReference,
  RuntimeConfigurationError,
} from "@/lib/runtime/config";

const ASAAS_HOSTED_CHECKOUT_BILLING_TYPES = new Set(["PIX", "CREDIT_CARD"]);
export const ASAAS_PRODUCTION_CONFIRMATION = "ENABLE_REAL_ASAAS_CHARGES";

export function isAsaasHostedCheckoutPlanSupported(plan: BillingPlan) {
  return (
    plan.allowedBillingTypes.length > 0 &&
    plan.allowedBillingTypes.every((type) => ASAAS_HOSTED_CHECKOUT_BILLING_TYPES.has(type))
  );
}

class AsaasBillingPlanSource implements BillingPlanSource {
  constructor(private readonly source: BillingPlanSource) {}

  async requireActive(code: string) {
    const plan = await this.source.requireActive(code);
    if (!isAsaasHostedCheckoutPlanSupported(plan)) {
      throw new BillingPlanError("PLAN_NOT_AVAILABLE");
    }
    return plan;
  }

  async listActive() {
    const plans = await this.source.listActive();
    return plans.filter(isAsaasHostedCheckoutPlanSupported);
  }
}

export function createAsaasBillingPlanSource(prisma: PrismaClient) {
  return new AsaasBillingPlanSource(new PrismaBillingPlanCatalog(prisma));
}

export function getAsaasBillingEnvironment(
  env: Record<string, string | undefined> = process.env,
): AsaasEnvironment {
  const environment = env.ASAAS_ENVIRONMENT?.trim().toLowerCase();
  if (environment !== "sandbox" && environment !== "production") {
    throw new RuntimeConfigurationError("ASAAS_BILLING_ENVIRONMENT_UNAVAILABLE");
  }
  if (environment === "production" && getRuntimeEnvironment(env) !== "production") {
    throw new RuntimeConfigurationError("ASAAS_PRODUCTION_RUNTIME_REQUIRED");
  }
  return environment;
}

export function getAsaasCheckoutExpirationMinutes(
  env: Record<string, string | undefined> = process.env,
) {
  const value = Number(env.ASAAS_CHECKOUT_EXPIRATION_MINUTES?.trim());
  if (!Number.isSafeInteger(value) || value < 10 || value > 1440) {
    throw new RuntimeConfigurationError("ASAAS_CHECKOUT_EXPIRATION_UNAVAILABLE");
  }
  return value;
}

export function getAsaasProductionTenantAllowlist(
  env: Record<string, string | undefined> = process.env,
) {
  const values = (env.ASAAS_PRODUCTION_TENANT_SLUGS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!values.length || values.some((value) => value === "*")) {
    throw new RuntimeConfigurationError("ASAAS_PRODUCTION_TENANT_ALLOWLIST_INVALID");
  }
  return new Set(values);
}

export type AsaasProductionBillingReadiness = {
  ready: boolean;
  issues: string[];
  runtimeEnvironment: string | null;
  providerEnvironment: string | null;
  externalEffectsMode: string | null;
  billingEnabled: boolean;
  productionHostname: string | null;
  tenantAllowlistCount: number;
  checkoutExpirationMinutes: number | null;
  apiKeyConfigured: boolean;
  webhookTokenConfigured: boolean;
};

export function getAsaasProductionBillingReadiness(
  env: Record<string, string | undefined> = process.env,
): AsaasProductionBillingReadiness {
  const issues: string[] = [];

  let runtimeEnvironment: string | null = null;
  try {
    runtimeEnvironment = getRuntimeEnvironment(env);
    if (runtimeEnvironment !== "production") issues.push("ASAAS_PRODUCTION_RUNTIME_REQUIRED");
  } catch {
    issues.push("APP_ENV_INVALID");
  }

  let providerEnvironment: string | null = null;
  const rawProviderEnvironment = env.ASAAS_ENVIRONMENT?.trim().toLowerCase() ?? "";
  if (rawProviderEnvironment === "production") {
    providerEnvironment = rawProviderEnvironment;
  } else {
    issues.push("ASAAS_PRODUCTION_ENVIRONMENT_REQUIRED");
  }

  let externalEffectsMode: string | null = null;
  try {
    externalEffectsMode = getExternalEffectsMode(env);
    if (externalEffectsMode !== "PRODUCTION") {
      issues.push("ASAAS_PRODUCTION_EXTERNAL_EFFECTS_REQUIRED");
    }
  } catch {
    issues.push("ASAAS_PRODUCTION_EXTERNAL_EFFECTS_REQUIRED");
  }

  const billingEnabled = env.ASAAS_PRODUCTION_BILLING_ENABLED?.trim() === "true";
  if (!billingEnabled) issues.push("ASAAS_PRODUCTION_BILLING_DISABLED");

  if (env.ASAAS_PRODUCTION_CONFIRMATION?.trim() !== ASAAS_PRODUCTION_CONFIRMATION) {
    issues.push("ASAAS_PRODUCTION_CONFIRMATION_REQUIRED");
  }

  const apiKeyConfigured = (env.ASAAS_API_KEY?.trim().length ?? 0) >= 24;
  if (!apiKeyConfigured) issues.push("ASAAS_PRODUCTION_API_KEY_UNAVAILABLE");

  const webhookTokenConfigured = (env.ASAAS_WEBHOOK_TOKEN?.trim().length ?? 0) >= 24;
  if (!webhookTokenConfigured) issues.push("ASAAS_PRODUCTION_WEBHOOK_TOKEN_UNAVAILABLE");

  let checkoutExpirationMinutes: number | null = null;
  try {
    checkoutExpirationMinutes = getAsaasCheckoutExpirationMinutes(env);
  } catch {
    issues.push("ASAAS_CHECKOUT_EXPIRATION_UNAVAILABLE");
  }

  let tenantAllowlistCount = 0;
  try {
    tenantAllowlistCount = getAsaasProductionTenantAllowlist(env).size;
  } catch {
    issues.push("ASAAS_PRODUCTION_TENANT_ALLOWLIST_INVALID");
  }

  let productionHostname: string | null = null;
  const expectedHostname = env.PRODUCTION_HOSTNAME?.trim().toLowerCase() ?? "";
  try {
    const origin = getPublicApplicationOrigin(env);
    productionHostname = origin.hostname.toLowerCase();
    if (
      !expectedHostname ||
      origin.protocol !== "https:" ||
      productionHostname !== expectedHostname ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      origin.username ||
      origin.password
    ) {
      issues.push("ASAAS_PRODUCTION_ORIGIN_MISMATCH");
    }
  } catch {
    issues.push("ASAAS_PRODUCTION_ORIGIN_MISMATCH");
  }

  return {
    ready: issues.length === 0,
    issues: [...new Set(issues)],
    runtimeEnvironment,
    providerEnvironment,
    externalEffectsMode,
    billingEnabled,
    productionHostname,
    tenantAllowlistCount,
    checkoutExpirationMinutes,
    apiKeyConfigured,
    webhookTokenConfigured,
  };
}

export function assertAsaasProductionBillingReady(
  env: Record<string, string | undefined> = process.env,
) {
  const readiness = getAsaasProductionBillingReadiness(env);
  if (!readiness.ready) {
    throw new RuntimeConfigurationError(readiness.issues[0] ?? "ASAAS_PRODUCTION_BILLING_UNAVAILABLE");
  }
  assertExternalEffectAllowed("production", env);
  requireRuntimeSecretReference("ASAAS_API_KEY", 24, env);
  requireRuntimeSecretReference("ASAAS_WEBHOOK_TOKEN", 24, env);
  return readiness;
}

export function assertAsaasProductionTenantAllowed(
  tenantSlug: string,
  env: Record<string, string | undefined> = process.env,
) {
  assertAsaasProductionBillingReady(env);
  if (!getAsaasProductionTenantAllowlist(env).has(tenantSlug)) {
    throw new RuntimeConfigurationError("ASAAS_PRODUCTION_TENANT_NOT_ALLOWED");
  }
}

export function createAsaasBillingAdapter(
  env: Record<string, string | undefined> = process.env,
  fetchImpl?: FetchLike,
) {
  const environment = getAsaasBillingEnvironment(env);
  if (environment === "production") {
    assertAsaasProductionBillingReady(env);
  } else {
    assertExternalEffectAllowed(environment, env);
    requireRuntimeSecretReference("ASAAS_API_KEY", 24, env);
  }

  const accessToken = requireRuntimeSecretReference("ASAAS_API_KEY", 24, env);
  const checkoutExpirationMinutes = getAsaasCheckoutExpirationMinutes(env);
  return new AsaasBillingAdapter(
    new AsaasHttpClient({ accessToken, environment, ...(fetchImpl ? { fetch: fetchImpl } : {}) }),
    checkoutExpirationMinutes,
  );
}

export function createAsaasBillingCheckoutService(
  prisma: PrismaClient,
  env: Record<string, string | undefined> = process.env,
  fetchImpl?: FetchLike,
) {
  const environment = getAsaasBillingEnvironment(env);
  const adapter = createAsaasBillingAdapter(env, fetchImpl);
  return new BillingCheckoutService(
    prisma,
    createAsaasBillingPlanSource(prisma),
    adapter,
    getPublicApplicationOrigin(env).origin,
    environment,
    env,
    environment === "production"
      ? (context) => assertAsaasProductionTenantAllowed(context.tenantSlug, env)
      : undefined,
  );
}

export function isAsaasBillingCheckoutAvailable(
  env: Record<string, string | undefined> = process.env,
) {
  try {
    const environment = getAsaasBillingEnvironment(env);
    if (environment === "production") {
      assertAsaasProductionBillingReady(env);
    } else {
      assertExternalEffectAllowed(environment, env);
      requireRuntimeSecretReference("ASAAS_API_KEY", 24, env);
    }
    getAsaasCheckoutExpirationMinutes(env);
    getPublicApplicationOrigin(env);
    return true;
  } catch {
    return false;
  }
}
