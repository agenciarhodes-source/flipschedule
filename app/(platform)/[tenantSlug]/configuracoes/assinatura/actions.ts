"use server";

import { redirect } from "next/navigation";
import { createAsaasBillingCheckoutService } from "@/domains/infrastructure/billing/asaas-runtime";
import { getApplicationContext } from "@/lib/auth/application-context";
import { getPrismaClient } from "@/lib/db";
import { ExternalEffectDisabledError } from "@/lib/runtime/external-effects";
import { RuntimeConfigurationError } from "@/lib/runtime/config";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function feedbackCode(error: unknown) {
  if (error instanceof ExternalEffectDisabledError || error instanceof RuntimeConfigurationError) {
    return "provider-unavailable";
  }
  const code = error instanceof Error ? error.message : "";
  const mapping: Record<string, string> = {
    ACCESS_DENIED: "denied",
    PLAN_NOT_AVAILABLE: "plan-unavailable",
    SUBSCRIPTION_ALREADY_EXISTS: "subscription-exists",
    CHECKOUT_ALREADY_ACTIVE_OTHER_PLAN: "checkout-active-other-plan",
    CHECKOUT_PAYMENT_PENDING_SYNC: "payment-sync",
    CHECKOUT_CREATION_IN_PROGRESS: "in-progress",
    CHECKOUT_RECONCILIATION_REQUIRED: "reconciliation",
    CHECKOUT_RESUME_FAILED: "provider-failed",
    CHECKOUT_CREATION_FAILED: "provider-failed",
    INVALID_APPLICATION_ORIGIN: "provider-unavailable",
  };
  return mapping[code] ?? "failed";
}

export async function createHostedCheckoutAction(formData: FormData) {
  const context = await getApplicationContext();
  const tenantSlug = value(formData, "tenantSlug");
  const planCode = value(formData, "planCode");
  const settingsPath = `/${context.tenantSlug}/configuracoes/assinatura`;

  if (tenantSlug !== context.tenantSlug || !planCode) {
    redirect(`${settingsPath}?checkout=invalid-request`);
  }

  let hostedCheckoutUrl: string | null = null;
  let feedback = "failed";
  try {
    const service = createAsaasBillingCheckoutService(getPrismaClient());
    const result = await service.create(context, planCode);
    hostedCheckoutUrl = result.hostedCheckoutUrl;
  } catch (error) {
    feedback = feedbackCode(error);
  }

  if (hostedCheckoutUrl) redirect(hostedCheckoutUrl);
  redirect(`${settingsPath}?checkout=${encodeURIComponent(feedback)}`);
}
