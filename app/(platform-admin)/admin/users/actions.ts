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
  if (error.message === "SELF_STATUS_CHANGE_DENIED") return "self-change-denied";
  if (error.message === "SELF_REVOCATION_DENIED") return "self-revocation-denied";
  if (error.message === "CONFIRMATION_REQUIRED") return "confirmation-required";
  if (error.message === "PLATFORM_OWNER_PROTECTED") return "owner-protected";
  if (error.message === "LAST_PLATFORM_OWNER_REQUIRED") return "last-owner-required";
  if (error.message === "USER_NOT_FOUND") return "user-not-found";
  if (error.message === "PLATFORM_ACCESS_DENIED") return "access-denied";
  return "invalid";
}

function returnTo(formData: FormData, result: string) {
  const raw = value(formData, "returnTo");
  const target = raw.startsWith("/admin/users") ? raw : "/admin/users";
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}result=${encodeURIComponent(result)}`;
}

export async function changePlatformUserStatusAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformAdministrationService(getPrismaClient());
  let result = "status-updated";

  try {
    await service.changeUserStatus(context, {
      userId: value(formData, "userId"),
      status: value(formData, "status"),
      reason: value(formData, "reason"),
      confirmation: value(formData, "confirmation"),
    });
  } catch (error) {
    result = errorCode(error);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/operators");
  redirect(returnTo(formData, result));
}

export async function revokePlatformUserSessionsAction(formData: FormData) {
  const context = await getPlatformContext();
  const service = new PlatformAdministrationService(getPrismaClient());
  let result = "sessions-revoked";

  try {
    await service.revokeSessions(context, value(formData, "userId"));
  } catch (error) {
    result = errorCode(error);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/operators");
  redirect(returnTo(formData, result));
}
