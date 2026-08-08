import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  BillingPlanError,
  type BillingPlan,
  type BillingPlanSource,
} from "@/domains/application/billing";
import type { FetchLike } from "./asaas-http-client";
import { AsaasBillingAdapter } from "./asaas-billing-adapter";
import { AsaasHttpClient } from "./asaas-http-client";
import { BillingCheckoutService } from "./billing-services";
import { PrismaBillingPlanCatalog } from "./commercial-billing-catalog";
import { assertExternalEffectAllowed } from "@/lib/runtime/external-effects";
import {
  getPublicApplicationOrigin,
  requireRuntimeSecretReference,
  RuntimeConfigurationError,
} from "@/lib/runtime/config";

const ASAAS_HOSTED_CHECKOUT_BILLING_TYPES = new Set(["PIX", "CREDIT_CARD"]);

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
): "sandbox" {
  const environment = env.ASAAS_ENVIRONMENT?.trim().toLowerCase();
  if (environment !== "sandbox") {
    throw new RuntimeConfigurationError("ASAAS_BILLING_ENVIRONMENT_UNAVAILABLE");
  }
  return "sandbox";
}

export function createAsaasBillingAdapter(
  env: Record<string, string | undefined> = process.env,
  fetchImpl?: FetchLike,
) {
  const environment = getAsaasBillingEnvironment(env);
  assertExternalEffectAllowed(environment, env);
  const accessToken = requireRuntimeSecretReference("ASAAS_API_KEY", 24, env);
  return new AsaasBillingAdapter(
    new AsaasHttpClient({ accessToken, environment, ...(fetchImpl ? { fetch: fetchImpl } : {}) }),
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
  );
}

export function isAsaasBillingCheckoutAvailable(
  env: Record<string, string | undefined> = process.env,
) {
  try {
    getAsaasBillingEnvironment(env);
    assertExternalEffectAllowed("sandbox", env);
    requireRuntimeSecretReference("ASAAS_API_KEY", 24, env);
    getPublicApplicationOrigin(env);
    return true;
  } catch {
    return false;
  }
}
