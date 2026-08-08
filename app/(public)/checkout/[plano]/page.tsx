import { createAsaasBillingPlanSource } from "@/domains/infrastructure/billing/asaas-runtime";
import { isCommercialOnboardingAvailable } from "@/domains/infrastructure/billing/commercial-onboarding-runtime";
import { getPrismaClient } from "@/lib/db";
import { createCommercialCheckoutAction } from "./actions";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const feedback: Record<string, string> = {
  "identity-unavailable":
    "Não foi possível iniciar esta contratação com os dados informados. Revise os dados ou fale com o suporte.",
  "rate-limited": "Muitas tentativas foram realizadas. Tente novamente mais tarde.",
  "already-active": "Já existe uma contratação em andamento para os dados informados.",
  "payment-sync": "O pagamento já foi identificado e o ambiente está sendo preparado.",
  reconciliation:
    "O resultado da tentativa anterior ainda está sendo confirmado com o provedor. Nenhuma nova cobrança foi criada.",
  "provider-rejected": "O provedor não aceitou a criação do checkout. Tente novamente mais tarde.",
  "provider-unavailable": "O checkout está temporariamente indisponível.",
  "plan-unavailable": "Este plano não está disponível para contratação online.",
  invalid: "Não foi possível iniciar a contratação. Revise os dados e tente novamente.",
  unavailable: "A contratação online está temporariamente indisponível.",
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ plano: string }>;
  searchParams?: Promise<{ result?: string }>;
}) {
  const { plano } = await params;
  const query = await searchParams;
  const resultMessage = query?.result ? feedback[query.result] : undefined;

  let plan: Awaited<ReturnType<ReturnType<typeof createAsaasBillingPlanSource>["requireActive"]>> | null = null;
  try {
    plan = await createAsaasBillingPlanSource(getPrismaClient()).requireActive(plano.toUpperCase());
  } catch {
    plan = null;
  }

  const available = Boolean(plan) && isCommercialOnboardingAvailable();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_34%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-6 py-12">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2563eb]">
          Contratação FlipSchedule
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          {plan ? plan.displayName : "Plano indisponível"}
        </h1>
        {plan ? (
          <p className="mt-3 text-lg text-slate-600">
            {money.format(plan.priceCents / 100)} · {plan.cycle === "MONTHLY" ? "mensal" : "anual"}
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
          <p className="font-medium text-slate-900">Como funciona</p>
          <p className="mt-1">
            Você informa os dados do ambiente e segue para o checkout hospedado do Asaas. O FlipSchedule só cria o ambiente após a confirmação financeira recebida pelo servidor. O retorno do navegador não libera acesso por conta própria.
          </p>
        </div>

        {resultMessage ? (
          <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            {resultMessage}
          </p>
        ) : null}

        {!available ? (
          <p className="mt-8 rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-700">
            A contratação online deste plano não está disponível neste momento.
          </p>
        ) : (
          <form action={createCommercialCheckoutAction} className="mt-8 grid gap-5 md:grid-cols-2">
            <input type="hidden" name="planCode" value={plan!.code} />
            <label className="text-sm font-medium text-slate-800 md:col-span-2">
              Nome da clínica ou empresa
              <input
                name="tenantName"
                required
                minLength={2}
                maxLength={120}
                autoComplete="organization"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-800 md:col-span-2">
              Identificador do ambiente
              <input
                name="tenantSlug"
                required
                minLength={3}
                maxLength={63}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="clinica-exemplo"
                autoCapitalize="none"
                autoCorrect="off"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono shadow-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Use letras minúsculas, números e hífens. Esse identificador fará parte do endereço do seu ambiente.
              </span>
            </label>
            <label className="text-sm font-medium text-slate-800">
              Seu nome
              <input
                name="ownerName"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              E-mail do proprietário
              <input
                name="ownerEmail"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <div className="md:col-span-2">
              <button className="w-full rounded-2xl bg-[#111827] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300">
                Continuar para pagamento seguro
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                O pagamento acontece no ambiente hospedado do Asaas. Nenhuma senha é solicitada nesta etapa.
              </p>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export const metadata = { other: { referrer: "no-referrer" } };
