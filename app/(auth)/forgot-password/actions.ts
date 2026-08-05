"use server";

import { headers } from "next/headers";
import { requestPasswordReset } from "@/lib/auth/password-recovery/service";

export type ForgotPasswordState = { ok?: boolean; error?: string; message?: string };
const ipFromHeaders = (h: Headers) => h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";

export async function submitForgotPassword(_: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const h = await headers();
  const result = await requestPasswordReset({ email: formData.get("email") }, { ip: ipFromHeaders(h) });
  if (!result.ok && result.code === "VALIDATION_ERROR") return { error: result.message };
  return { ok: true, message: result.message };
}
