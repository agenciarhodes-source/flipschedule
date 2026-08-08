"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createCommercialOnboardingService } from "@/domains/infrastructure/billing/commercial-onboarding-runtime";
import { getPrismaClient } from "@/lib/db";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function resultCode(error: unknown) {
  if (!(error instanceof Error)) return "unavailable";
  if (
    error.message === "ONBOARDING_EMAIL_UNAVAILABLE" ||
    error.message === "ONBOARDING_SLUG_UNAVAILABLE"
  ) {
    return "identity-unavailable";
  }
  if (error.message === "ONBOARDING_RATE_LIMITED") return "rate-limited";
  if (error.message === "ONBOARDING_ALREADY_ACTIVE") return "already-active";
  if (error.message === "ONBOARDING_PAYMENT_PENDING_PROVISIONING") return "payment-sync";
  if (error.message === "ONBOARDING_RECONCILIATION_REQUIRED") return "reconciliation";
  if (error.message === "ONBOARDING_CHECKOUT_REJECTED") return "provider-rejected";
  if (error.message === "ONBOARDING_RESUME_FAILED") return "provider-unavailable";
  if (error.message === "PLAN_NOT_AVAILABLE") return "plan-unavailable";
  return "invalid";
}

function ipFromHeaders(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}

export async function createCommercialCheckoutAction(formData: FormData) {
  const planCode = value(formData, "planCode");
  let hostedCheckoutUrl: string | null = null;
  let result = "invalid";

  try {
    const h = await headers();
    const service = createCommercialOnboardingService(getPrismaClient());
    const created = await service.create(
      {
        planCode,
        ownerEmail: value(formData, "ownerEmail"),
        ownerName: value(formData, "ownerName"),
        tenantName: value(formData, "tenantName"),
        tenantSlug: value(formData, "tenantSlug"),
      },
      { ip: ipFromHeaders(h) },
    );
    hostedCheckoutUrl = created.hostedCheckoutUrl;
  } catch (error) {
    result = resultCode(error);
  }

  if (hostedCheckoutUrl) redirect(hostedCheckoutUrl);
  const safePlanCode = encodeURIComponent(planCode || "indisponivel");
  redirect(`/checkout/${safePlanCode}?result=${encodeURIComponent(result)}`);
}
