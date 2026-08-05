"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Eyebrow } from "@/components/shared/eyebrow";
import { authClient } from "@/lib/auth/client";
import { clearTabSession, markTabSessionActivity } from "@/lib/auth/tab-session";
import { isSafeInternalCallback, normalizeEmail } from "@/lib/auth/utils";
import { publicUrls } from "@/lib/config/public-urls";

function getInitialFeedback(reason: string | null) {
  if (reason === "inactive") return "Sua sessão expirou após 1 hora sem atividade.";
  if (reason === "expired") return "Sua sessão expirou. Entre novamente para continuar.";
  if (reason === "tab") return "Faça login para acessar o sistema nesta aba.";
  if (reason === "login-required") return "O dashboard só pode ser acessado após o login.";
  return null;
}

export function LoginPageContent() {
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackURL");
  const callbackURL =
    isSafeInternalCallback(requestedCallback) && requestedCallback !== "/login"
      ? requestedCallback!
      : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPreparing, setIsPreparing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(() =>
    getInitialFeedback(searchParams.get("reason")),
  );

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);

  useEffect(() => {
    let active = true;
    clearTabSession();

    async function resetPreviousSession() {
      try {
        await authClient.signOut();
      } catch {
        // The login form remains available even when there was no previous session.
      } finally {
        if (active) setIsPreparing(false);
      }
    }

    void resetPreviousSession();
    return () => {
      active = false;
    };
  }, []);

  async function resolveDestinationAfterLogin() {
    if (callbackURL !== "/dashboard") return callbackURL;

    const response = await fetch("/api/auth/post-login-destination", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("post_login_destination_failed");

    const payload = (await response.json()) as { destination?: unknown };
    if (
      typeof payload.destination !== "string" ||
      !isSafeInternalCallback(payload.destination) ||
      payload.destination === "/login"
    ) {
      throw new Error("invalid_post_login_destination");
    }

    return payload.destination;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPreparing || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await authClient.signIn.email({
        email: normalizedEmail,
        password,
        callbackURL: "/dashboard",
        rememberMe: false,
      });

      if (response.error) {
        setFeedback("Credenciais inválidas. Verifique seu e-mail e senha.");
        return;
      }

      markTabSessionActivity();
      const destination = await resolveDestinationAfterLogin();
      window.location.replace(destination);
    } catch (error) {
      clearTabSession();
      try {
        await authClient.signOut();
      } catch {
        // The feedback below is enough when sign-out cannot be confirmed.
      }
      setFeedback("Não foi possível concluir o acesso. Tente novamente.");
      console.error("login_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-bg text-ink lg:grid-cols-2">
      <section className="hidden border-r border-line bg-bg-alt p-12 lg:flex lg:flex-col lg:justify-between">
        <span className="font-display text-3xl">Flip<em className="not-italic text-primary">Schedule</em></span>
        <div>
          <Eyebrow className="mb-5">Operação clínica integrada</Eyebrow>
          <h1 className="max-w-lg font-display text-6xl leading-tight">Sua operação, <em className="not-italic text-primary">em um só lugar</em>.</h1>
          <p className="mt-6 max-w-md text-ink-muted">Agenda, atendimento, CRM e propostas com a linguagem visual do FlipSchedule.</p>
        </div>
        <p className="font-mono text-xs text-ink-dim">Acesso protegido por e-mail e senha</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <span className="font-display text-2xl lg:hidden">Flip<em className="not-italic text-primary">Schedule</em></span>
          <Eyebrow className="mb-4 mt-12 lg:mt-0">Acesso ao aplicativo</Eyebrow>
          <h1 className="font-display text-4xl">Entrar no FlipSchedule</h1>
          <p className="mt-4 leading-relaxed text-ink-muted">Informe seu e-mail e senha para iniciar uma nova sessão nesta aba.</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit} aria-label="Formulário de acesso">
            <label className="block text-sm font-medium" htmlFor="email">
              E-mail
              <input className="mt-2 min-h-12 w-full rounded-md border border-line bg-bg-alt px-4 text-ink placeholder:text-ink-dim disabled:opacity-60" id="email" name="email" type="email" autoComplete="email" placeholder="voce@clinica.com.br" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isPreparing} required />
            </label>
            <label className="block text-sm font-medium" htmlFor="password">
              Senha
              <input className="mt-2 min-h-12 w-full rounded-md border border-line bg-bg-alt px-4 text-ink placeholder:text-ink-dim disabled:opacity-60" id="password" name="password" type="password" autoComplete="current-password" placeholder="Sua senha" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isPreparing} required />
            </label>
            <div className="flex justify-end">
              <Link className="text-sm text-primary hover:underline" href="/forgot-password">Esqueci minha senha</Link>
            </div>
            {feedback ? <p className="rounded-md border border-warm/20 bg-warm/10 px-3 py-2 text-sm text-warm" role="alert">{feedback}</p> : null}
            <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isPreparing || isSubmitting} aria-describedby="login-status">
              {isPreparing ? "Preparando acesso…" : isSubmitting ? "Entrando…" : "Entrar"}
              <LockKeyhole aria-hidden="true" size={16} />
            </button>
            <p className="text-center text-xs text-ink-dim" id="login-status">Ao fechar esta aba, será necessário informar novamente o login e a senha. A sessão também expira após 1 hora sem atividade.</p>
          </form>
          <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-sm">
            <Link className="inline-flex items-center gap-2 text-primary hover:underline" href="/demo">Conhecer a demonstração <ArrowRight aria-hidden="true" size={14} /></Link>
            <a className="text-ink-muted hover:text-ink" href={publicUrls.marketingUrl}>Visitar o site oficial</a>
          </div>
        </div>
      </section>
    </main>
  );
}
