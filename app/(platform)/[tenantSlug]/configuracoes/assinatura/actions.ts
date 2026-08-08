"use server";

import { redirect } from "next/navigation";
import {
  createAsaasBillingCheckoutService,
  createAsaasBillingPlanChangeService,
} from "@/domains/infrastructure/billing/asaas-runtime";
import { getApplicationContext } from "@/lib/auth/application-context";
import { getPrismaClient } from "@/lib/db";
import { ExternalEffectDisabledError } from "@/lib/runtime/external-effects";
import { RuntimeConfigurationError } from "@/lib/runtime/config";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function checkoutFeedbackCode(error: unknown) {
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

function planChangeFeedbackCode(error: unknown) {
  if (error instanceof ExternalEffectDisabledError || error instanceof RuntimeConfigurationError) {
    return "provider-unavailable";
  }
  const code = error instanceof Error ? error.message : "";
  const mapping: Record<string, string> = {
    ACCESS_DENIED: "denied",
    REAUTHENTICATION_REQUIRED: "confirmation",
    PLAN_NOT_AVAILABLE: "plan-unavailable",
    SUBSCRIPTION_NOT_ACTIVE: "subscription-not-active",
    RECONCILIATION_REQUIRED: "reconciliation",
    PLAN_CHANGE_RECONCILIATION_REQUIRED: "reconciliation",
    PLAN_CHANGE_CANCELLATION_PENDING: "cancellation-pending",
    PLAN_ALREADY_ACTIVE: "already-active",
    PLAN_CHANGE_IN_PROGRESS: "in-progress",
    PLAN_CHANGED_RETRY: "plan-changed",
    PLAN_CLINIC_LIMIT_BELOW_USAGE: "capacity",
    PLAN_USER_LIMIT_BELOW_USAGE: "capacity",
    PLAN_CHANGE_BILLING_TYPE_UNSUPPORTED: "billing-type",
    PLAN_CHANGE_PROVIDER_UNAVAILABLE: "provider-unavailable",
    PLAN_CHANGE_PROVIDER_REJECTED: "provider-failed",
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
    feedback = checkoutFeedbackCode(error);
  }

  if (hostedCheckoutUrl) redirect(hostedCheckoutUrl);
  redirect(`${settingsPath}?checkout=${encodeURIComponent(feedback)}`);
}

export async function changeSubscriptionPlanAction(formData: FormData) {
  const context = await getApplicationContext();
  const tenantSlug = value(formData, "tenantSlug");
  const planCode = value(formData, "planCode");
  const confirmation = value(formData, "confirmation");
  const settingsPath = `/${context.tenantSlug}/configuracoes/assinatura`;

  if (tenantSlug !== context.tenantSlug || !planCode) {
    redirect(`${settingsPath}?planChange=invalid-request`);
  }

  let feedback = "success";
  try {
    const service = createAsaasBillingPlanChangeService(getPrismaClient());
    await service.change(context, planCode, confirmation);
  } catch (error) {
    feedback = planChangeFeedbackCode(error);
  }

  redirect(`${settingsPath}?planChange=${encodeURIComponent(feedback)}`);
}
