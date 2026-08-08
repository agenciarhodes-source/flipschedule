"use server";

import { activateAccount } from "@/lib/auth/account-activation/service";

export type ActivateAccountState = { ok?: boolean; error?: string; message?: string };

export async function submitAccountActivation(
  _: ActivateAccountState,
  formData: FormData,
): Promise<ActivateAccountState> {
  const result = await activateAccount({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmation: formData.get("confirmation"),
  });
  return result.ok ? { ok: true, message: result.message } : { error: result.message };
}
