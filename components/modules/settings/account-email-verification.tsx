"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";

type RequestState = "idle" | "sending" | "sent" | "error";

export function AccountEmailVerification(props: {
  email: string;
  verified: boolean;
  tenantSlug: string;
}) {
  const [state, setState] = useState<RequestState>("idle");

  async function requestVerification() {
    setState("sending");
    try {
      const callbackURL = `/${encodeURIComponent(props.tenantSlug)}/configuracoes?emailVerification=success`;
      const result = await authClient.sendVerificationEmail({ email: props.email, callbackURL });
      setState(result.error ? "error" : "sent");
    } catch {
      setState("error");
    }
  }

  return (
    <section className="card-surface p-5" aria-labelledby="account-email-title">
      <p className="font-mono text-xs uppercase text-primary">Segurança da conta</p>
      <h2 id="account-email-title" className="font-display text-2xl">E-mail principal</h2>
      <p className="mt-2 text-sm text-ink-muted">{props.email}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {props.verified ? "Endereço confirmado." : "Este endereço ainda não foi confirmado."}
      </p>
      {!props.verified ? (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={requestVerification}
            disabled={state === "sending" || state === "sent"}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "sending" ? "Enviando…" : state === "sent" ? "E-mail solicitado" : "Confirmar meu e-mail"}
          </button>
          {state === "sent" ? <p role="status" className="text-xs text-ink-muted">Confira sua caixa de entrada. O link expira em 60 minutos.</p> : null}
          {state === "error" ? <p role="alert" className="text-xs text-red-600">A confirmação não está disponível agora. Tente novamente mais tarde.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
