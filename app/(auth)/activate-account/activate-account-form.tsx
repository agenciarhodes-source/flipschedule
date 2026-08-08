"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { submitAccountActivation, type ActivateAccountState } from "./actions";

export function ActivateAccountForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    submitAccountActivation,
    {} as ActivateAccountState,
  );

  useEffect(() => {
    if (token) window.history.replaceState(null, "", "/activate-account");
  }, [token]);

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Crie sua senha de acesso</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>12 a 128 caracteres</li>
          <li>Letras maiúsculas e minúsculas</li>
          <li>Número e caractere especial</li>
        </ul>
      </div>
      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium text-slate-800">
          Nova senha
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmation" className="text-sm font-medium text-slate-800">
          Confirmar senha
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
        />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" aria-live="polite" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message} <Link className="font-semibold underline" href="/login">Entrar</Link>.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !token || state.ok}
        className="w-full rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Ativando..." : "Criar senha e ativar acesso"}
      </button>
    </form>
  );
}
