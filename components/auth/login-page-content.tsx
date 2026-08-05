"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { markSessionActivity } from "@/components/auth/session-inactivity-guard";
import { Eyebrow } from "@/components/shared/eyebrow";
import { authClient } from "@/lib/auth/client";
import { normalizeEmail, isSafeInternalCallback } from "@/lib/auth/utils";
import { publicUrls } from "@/lib/config/public-urls";

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackURL");
  const callbackURL = isSafeInternalCallback(requestedCallback) ? requestedCallback! : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(() => {
    const reason = searchParams.get("reason");
    if (reason === "inactive") return "Sua sessão expirou após 1 hora sem atividade.";
    if (reason === "expired") return "Sua sessão expirou. Entre novamente para continuar.";
    return null;
  });

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await authClient.signIn.email({
        email: normalizedEmail,
        password,
        callbackURL,
        rememberMe: false,
      });

      if (response.error) {
        setFeedback("Credenciais inválidas. Verifique seu e-mail e senha.");
        return;
      }

      markSessionActivity();
      router.replace(callbackURL);
    } catch (error) {
      setFeedback("Não foi possível entrar no momento. Tente novamente.");
      console.error("login_failed", { message: error instanceof Error ? error.message : "unknown" });
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
        <p className="font-mono text-xs text-ink-dim">Acesso real será disponibilizado em uma fase futura</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <span className="font-display text-2xl lg:hidden">Flip<em className="not-italic text-primary">Schedule</em></span>
          <Eyebrow className="mb-4 mt-12 lg:mt-0">Acesso ao aplicativo</Eyebrow>
          <h1 className="font-display text-4xl">Entrar no FlipSchedule</h1>
          <p className="mt-4 leading-relaxed text-ink-muted">Use seu e-mail e senha para acessar o ambiente real.</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit} aria-label="Formulário de acesso">
            <label className="block text-sm font-medium" htmlFor="email">
              E-mail
              <input className="mt-2 min-h-12 w-full rounded-md border border-line bg-bg-alt px-4 text-ink placeholder:text-ink-dim" id="email" name="email" type="email" autoComplete="email" placeholder="voce@clinica.com.br" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block text-sm font-medium" htmlFor="password">
              Senha
              <input className="mt-2 min-h-12 w-full rounded-md border border-line bg-bg-alt px-4 text-ink placeholder:text-ink-dim" id="password" name="password" type="password" autoComplete="current-password" placeholder="Sua senha" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <div className="flex justify-end">
              <Link className="text-sm text-primary hover:underline" href="/forgot-password">Esqueci minha senha</Link>
            </div>
            {feedback ? <p className="rounded-md border border-warm/20 bg-warm/10 px-3 py-2 text-sm text-warm" role="alert">{feedback}</p> : null}
            <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isSubmitting} aria-describedby="login-status">
              {isSubmitting ? "Entrando…" : "Entrar"}
              <LockKeyhole aria-hidden="true" size={16} />
            </button>
            <p className="text-center text-xs text-ink-dim" id="login-status">A sessão expira após 1 hora sem atividade e não permanece salva ao fechar o navegador.</p>
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
