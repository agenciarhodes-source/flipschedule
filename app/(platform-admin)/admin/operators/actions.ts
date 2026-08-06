"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PlatformAdministrationService } from "@/domains/infrastructure/platform/services";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function errorCode(error: unknown) {
  if (!(error instanceof Error)) return "unavailable";
  if (error.message === "SELF_OPERATOR_CHANGE_DENIED") return "self-change-denied";
  if (error.message === "LAST_PLATFORM_OWNER_REQUIRED") return "last-owner-required";
  if (error.message === "PLATFORM_ACCESS_DENIED") return "access-denied";
  if (error.message === "OPERATOR_CHANGE_REQUIRED") return "no-change";
  return "invalid";
}

function returnTo(formData: FormData, result: string) {
  const raw = value(formData, "returnTo");
  const target = raw.startsWith("/admin/operators") ? raw : "/admin/operators";
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}result=${encodeURIComponent(result)}`;
}

export async function changePlatformOperatorAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformAdministrationService(getPrismaClient());
  const currentRole = value(formData, "currentRole");
  const currentStatus = value(formData, "currentStatus");
  const nextRole = value(formData, "role");
  const nextStatus = value(formData, "status");
  let result = "operator-updated";

  try {
    const changes = {
      operatorId: value(formData, "operatorId"),
      ...(nextRole !== currentRole ? { role: nextRole } : {}),
      ...(nextStatus !== currentStatus ? { status: nextStatus } : {}),
    };
    if (!("role" in changes) && !("status" in changes)) {
      result = "no-change";
    } else {
      await service.changeOperator(context, changes);
    }
  } catch (error) {
    result = errorCode(error);
  }

  revalidatePath("/admin/operators");
  revalidatePath("/admin/users");
  redirect(returnTo(formData, result));
}
