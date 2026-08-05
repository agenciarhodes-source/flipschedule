"use server";

import { headers } from "next/headers";
import { resetPassword } from "@/lib/auth/password-recovery/service";

export type ResetPasswordState = { ok?: boolean; error?: string; message?: string };
const ipFromHeaders = (h: Headers) => h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";

export async function submitResetPassword(_: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const h = await headers();
  const result = await resetPassword({ token: formData.get("token"), newPassword: formData.get("newPassword"), confirmation: formData.get("confirmation") }, { ip: ipFromHeaders(h) });
  return result.ok ? { ok: true, message: result.message } : { error: result.message };
}
