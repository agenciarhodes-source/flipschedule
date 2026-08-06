"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PlatformEmailOperationsService } from "@/domains/infrastructure/platform/email-operations";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function errorCode(error: unknown) {
  if (!(error instanceof Error)) return "unavailable";
  if (error.message === "SUPPRESSION_NOT_FOUND") return "suppression-not-found";
  if (error.message === "SUPPRESSION_ALREADY_LIFTED") return "suppression-already-lifted";
  if (error.message === "PLATFORM_ACCESS_DENIED") return "access-denied";
  return "invalid";
}

function returnTo(formData: FormData, result: string) {
  const raw = value(formData, "returnTo");
  const target = raw.startsWith("/admin/email") ? raw : "/admin/email";
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}result=${encodeURIComponent(result)}`;
}

export async function liftEmailSuppressionAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformEmailOperationsService(getPrismaClient());
  let result = "suppression-lifted";

  try {
    await service.liftSuppression(context, {
      suppressionId: value(formData, "suppressionId"),
      reason: value(formData, "reason"),
      confirmation: value(formData, "confirmation"),
    });
  } catch (error) {
    result = errorCode(error);
  }

  revalidatePath("/admin/email");
  revalidatePath("/admin/operations");
  revalidatePath("/admin/audit");
  redirect(returnTo(formData, result));
}
