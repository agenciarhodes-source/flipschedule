import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { getPublicApplicationOrigin } from "@/lib/runtime/config";
import type { FetchLike } from "./asaas-http-client";
import {
  assertAsaasProductionTenantAllowed,
  createAsaasBillingAdapter,
  createAsaasBillingPlanSource,
  getAsaasBillingEnvironment,
  isAsaasBillingCheckoutAvailable,
} from "./asaas-runtime";
import { CommercialOnboardingService } from "./commercial-onboarding-service";

export function createCommercialOnboardingService(
  prisma: PrismaClient,
  env: Record<string, string | undefined> = process.env,
  fetchImpl?: FetchLike,
) {
  const environment = getAsaasBillingEnvironment(env);
  return new CommercialOnboardingService(
    prisma,
    createAsaasBillingPlanSource(prisma),
    createAsaasBillingAdapter(env, fetchImpl),
    getPublicApplicationOrigin(env).origin,
    environment === "production"
      ? (tenantSlug) => assertAsaasProductionTenantAllowed(tenantSlug, env)
      : undefined,
  );
}

export function isCommercialOnboardingAvailable(
  env: Record<string, string | undefined> = process.env,
) {
  return isAsaasBillingCheckoutAvailable(env);
}
