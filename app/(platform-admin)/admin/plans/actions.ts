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

export async function createPlanAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformCustomerAdministrationService(getPrismaClient());
  let result = "created";
  try {
    await service.createPlan(context, {
      code: value(formData, "code").toUpperCase(),
      name: value(formData, "name"),
      cycle: value(formData, "cycle"),
      priceCents: Math.round(Number(value(formData, "price")) * 100),
      trialDays: value(formData, "trialDays") || "0",
      maxClinics: value(formData, "maxClinics") || null,
      maxUsers: value(formData, "maxUsers") || null,
    });
  } catch (error) {
    result = error instanceof Error && error.message.includes("Unique") ? "code-conflict" : "invalid";
  }
  revalidatePath("/admin/plans");
  redirect(`/admin/plans?result=${encodeURIComponent(result)}`);
}

export async function setPlanStatusAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformCustomerAdministrationService(getPrismaClient());
  let result = "status-updated";
  try {
    await service.setPlanStatus(context, {
      planId: value(formData, "planId"),
      status: value(formData, "status"),
    });
  } catch {
    result = "invalid";
  }
  revalidatePath("/admin/plans");
  revalidatePath("/admin/clients");
  redirect(`/admin/plans?result=${encodeURIComponent(result)}`);
}
