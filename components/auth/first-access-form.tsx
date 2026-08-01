"use client";

import { useActionState } from "react";
import { submitFirstAccess } from "@/app/(auth)/first-access/actions";

export function FirstAccessForm() {
  const [state, action, pending] = useActionState(submitFirstAccess, {});
  return <form action={action} className="mt-8 space-y-5">
    <PasswordField id="currentPassword" label="Senha temporária atual" autoComplete="current-password" />
    <PasswordField id="newPassword" label="Nova senha" autoComplete="new-password" />
    <PasswordField id="confirmation" label="Confirme a nova senha" autoComplete="new-password" />
    <p className="text-sm text-ink-muted">Use ao menos 12 caracteres, com letras maiúsculas e minúsculas, número e caractere especial.</p>
    {state.error ? <p role="alert" className="rounded-md border border-warm/20 bg-warm/10 px-3 py-2 text-sm text-warm">{state.error}</p> : null}
    <button disabled={pending} className="min-h-12 w-full rounded-md bg-primary font-medium text-primary-foreground disabled:opacity-70">{pending ? "Atualizando…" : "Definir nova senha"}</button>
  </form>;
}

function PasswordField({ id, label, autoComplete }: { id: string; label: string; autoComplete: string }) {
  return <label className="block text-sm font-medium" htmlFor={id}>{label}<input required className="mt-2 min-h-12 w-full rounded-md border border-line bg-bg-alt px-4" id={id} name={id} type="password" autoComplete={autoComplete} /></label>;
}
