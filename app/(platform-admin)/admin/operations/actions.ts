"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PlatformOperationsService } from "@/domains/infrastructure/platform/operations-service";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function resultCode(error: unknown) {
  if (!(error instanceof Error)) return "unavailable";
  if (error.message === "OPERATION_NOT_FOUND") return "not-found";
  if (error.message === "OPERATION_NOT_RETRYABLE") return "not-retryable";
  if (error.message === "PLATFORM_ACCESS_DENIED") return "access-denied";
  return "invalid";
}

function safeReturnTo(formData: FormData, result: string) {
  const raw = value(formData, "returnTo");
  const target = raw.startsWith("/admin/operations") ? raw : "/admin/operations";
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}result=${encodeURIComponent(result)}`;
}

export async function retryPlatformOperationAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformOperationsService(getPrismaClient());
  let result = "retry-requested";

  try {
    await service.retry(context, {
      operationType: value(formData, "operationType"),
      operationId: value(formData, "operationId"),
      reason: value(formData, "reason"),
    });
  } catch (error) {
    result = resultCode(error);
  }

  revalidatePath("/admin/operations");
  revalidatePath("/admin/audit");
  redirect(safeReturnTo(formData, result));
}
