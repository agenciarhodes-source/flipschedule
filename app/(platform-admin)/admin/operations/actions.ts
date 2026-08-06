"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PlatformOperationsService } from "@/domains/infrastructure/platform/operations";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function errorCode(error: unknown) {
  if (!(error instanceof Error)) return "unavailable";
  if (error.message === "OPERATION_NOT_FOUND") return "not-found";
  if (error.message === "OPERATION_NOT_RETRYABLE") return "not-retryable";
  if (error.message === "OPERATION_CONFLICT") return "conflict";
  if (error.message === "PLATFORM_ACCESS_DENIED") return "access-denied";
  return "invalid";
}

function returnTo(formData: FormData, result: string) {
  const raw = value(formData, "returnTo");
  const target = raw.startsWith("/admin/operations") ? raw : "/admin/operations";
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}result=${encodeURIComponent(result)}`;
}

export async function requeuePlatformOperationAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformOperationsService(getPrismaClient());
  let result = "requeued";

  try {
    await service.requeue(context, {
      operationId: value(formData, "operationId"),
      operationType: value(formData, "operationType"),
      reason: value(formData, "reason"),
      confirmation: value(formData, "confirmation"),
    });
  } catch (error) {
    result = errorCode(error);
  }

  revalidatePath("/admin/operations");
  revalidatePath("/admin/audit");
  redirect(returnTo(formData, result));
}
