"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PlatformSubscriptionAdministrationService } from "@/domains/infrastructure/platform/subscription-service";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function errorCode(error: unknown) {
  if (!(error instanceof Error)) return "unavailable";
  if (error.message === "SUBSCRIPTION_NOT_FOUND") return "subscription-not-found";
  if (error.message === "EXTERNAL_SUBSCRIPTION_READ_ONLY") return "external-read-only";
  if (error.message === "ARCHIVED_TENANT_CANNOT_ACTIVATE") return "tenant-archived";
  if (error.message === "CONFIRMATION_REQUIRED") return "confirmation-required";
  if (error.message === "PLATFORM_ACCESS_DENIED") return "access-denied";
  return "invalid";
}

function returnTo(formData: FormData, result: string) {
  const raw = value(formData, "returnTo");
  const target = raw.startsWith("/admin/subscriptions") ? raw : "/admin/subscriptions";
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}result=${encodeURIComponent(result)}`;
}

export async function changeManualSubscriptionStatusAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformSubscriptionAdministrationService(getPrismaClient());
  let result = "status-updated";

  try {
    await service.changeManualStatus(context, {
      subscriptionId: value(formData, "subscriptionId"),
      status: value(formData, "status"),
      reason: value(formData, "reason"),
      confirmation: value(formData, "confirmation"),
    });
  } catch (error) {
    result = errorCode(error);
  }

  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  redirect(returnTo(formData, result));
}
