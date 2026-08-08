"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PlatformCustomerAdministrationService } from "@/domains/infrastructure/platform/customer-service";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function errorCode(error: unknown) {
  if (!(error instanceof Error)) return "unavailable";
  if (error.message === "TENANT_SLUG_CONFLICT") return "slug-conflict";
  if (error.message === "OWNER_EMAIL_CONFLICT") return "email-conflict";
  if (error.message === "PLAN_NOT_ACTIVE") return "plan-inactive";
  if (
    error.message === "PLAN_CLINIC_LIMIT_BELOW_USAGE" ||
    error.message === "PLAN_USER_LIMIT_BELOW_USAGE"
  ) {
    return "plan-capacity";
  }
  if (error.message === "PROVIDER_MANAGED_SUBSCRIPTION_CHANGE_REQUIRED") {
    return "provider-managed-plan";
  }
  if (error.message === "TENANT_NOT_FOUND") return "tenant-not-found";
  return "invalid";
}

export async function createClientAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformCustomerAdministrationService(getPrismaClient());
  let result = "created";
  try {
    await service.createClient(context, {
      tenantName: value(formData, "tenantName"),
      tenantSlug: value(formData, "tenantSlug"),
      timezone: value(formData, "timezone"),
      locale: value(formData, "locale"),
      ownerName: value(formData, "ownerName"),
      ownerEmail: value(formData, "ownerEmail"),
      temporaryPassword: value(formData, "temporaryPassword"),
      planId: value(formData, "planId"),
    });
  } catch (error) {
    result = errorCode(error);
  }
  revalidatePath("/admin/clients");
  redirect(`/admin/clients?result=${encodeURIComponent(result)}`);
}

export async function setClientStatusAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformCustomerAdministrationService(getPrismaClient());
  let result = "status-updated";
  try {
    await service.setClientStatus(context, {
      tenantId: value(formData, "tenantId"),
      status: value(formData, "status"),
      reason: value(formData, "reason"),
    });
  } catch (error) {
    result = errorCode(error);
  }
  revalidatePath("/admin/clients");
  redirect(`/admin/clients?result=${encodeURIComponent(result)}`);
}

export async function assignClientPlanAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformCustomerAdministrationService(getPrismaClient());
  let result = "plan-updated";
  try {
    await service.assignPlan(context, {
      tenantId: value(formData, "tenantId"),
      planId: value(formData, "planId"),
    });
  } catch (error) {
    result = errorCode(error);
  }
  revalidatePath("/admin/clients");
  revalidatePath("/admin/subscriptions");
  redirect(`/admin/clients?result=${encodeURIComponent(result)}`);
}
