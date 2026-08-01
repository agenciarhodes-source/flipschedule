"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { completeFirstAccess, firstAccessSchema } from "@/lib/auth/first-access";
import { getAuth } from "@/lib/auth/server";

export type FirstAccessState = { error?: string };

export async function submitFirstAccess(_: FirstAccessState, formData: FormData): Promise<FirstAccessState> {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session?.user || !session.session?.id) redirect("/login");
  const input = { currentPassword: formData.get("currentPassword"), newPassword: formData.get("newPassword"), confirmation: formData.get("confirmation") };
  if (!firstAccessSchema.safeParse(input).success) return { error: "Não foi possível atualizar a senha. Revise os dados informados." };
  try {
    await completeFirstAccess(session.user.id, session.session.id, input as { currentPassword: string; newPassword: string; confirmation: string });
  } catch {
    return { error: "Não foi possível atualizar a senha. Revise os dados informados." };
  }
  redirect("/dashboard");
}
