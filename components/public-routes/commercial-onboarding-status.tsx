import Link from "next/link";

import { readCommercialOnboardingPublicStatus } from "@/domains/infrastructure/billing/commercial-onboarding-status";
import { getPrismaClient } from "@/lib/db";

const copy = {
  CREATED: {
    title: "Checkout em preparação",
    description: "A solicitação foi registrada, mas o checkout ainda não foi confirmado pelo provedor.",
  },
  CHECKOUT_ACTIVE: {
    title: "Aguardando confirmação",
    description: "O checkout está em andamento. O acesso só será criado depois da confirmação financeira recebida pelo servidor.",
  },
  PAID: {
    title: "Pagamento confirmado",
    description: "O pagamento foi identificado e o FlipSchedule está preparando seu ambiente.",
  },
  PROVISIONED: {
    title: "Ambiente criado",
    description: "Seu ambiente já foi provisionado com segurança.",
  },
  CANCELLED: {
    title: "Checkout cancelado",
    description: "O provedor confirmou o cancelamento deste checkout.",
  },
  EXPIRED: {
    title: "Checkout expirado",
    description: "O provedor confirmou que este checkout expirou.",
  },
  RECONCILIATION_REQUIRED: {
    title: "Confirmação em andamento",
    description: "O resultado da tentativa ainda precisa ser confirmado com o provedor. Nenhuma nova cobrança será criada automaticamente.",
  },
  FAILED: {
    title: "Não foi possível concluir",
    description: "A contratação não pôde ser concluída automaticamente. Nenhum novo checkout será criado sem uma nova ação sua.",
  },
} as const;

export async function CommercialOnboardingStatus({
  token,
  eyebrow = "Status da contratação",
}: {
  token: string;
  eyebrow?: string;
}) {
  const status = await readCommercialOnboardingPublicStatus(getPrismaClient(), token);
  const message = status ? copy[status.status] : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_34%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-6 py-12">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-lg items-center">
        <div className="w-full rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2563eb]">{eyebrow}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            {message?.title ?? "Não foi possível consultar este checkout"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {message?.description ?? "O link informado é inválido ou não corresponde a uma contratação disponível."}
          </p>

          {status?.ready ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800">
              {status.accessSetupSent
                ? "Enviamos ao e-mail do proprietário um link pessoal para criar a senha e concluir o primeiro acesso."
                : "O ambiente foi criado. Se o e-mail de ativação ainda não chegou, use a recuperação de senha com o e-mail informado na contratação."}
            </div>
          ) : null}

          {status?.needsSupport ? (
            <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-800">
              O pagamento foi confirmado, mas a preparação automática precisa de revisão operacional. Não refaça o pagamento.
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {status?.ready ? (
              <Link className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" href="/login">
                Ir para o login
              </Link>
            ) : null}
            <Link className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" href="/">
              Voltar ao início
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
