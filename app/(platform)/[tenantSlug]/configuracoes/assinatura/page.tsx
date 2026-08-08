import Link from "next/link";
import {
  billingCheckoutStatusLabel,
  paymentStatusLabel,
  subscriptionStatusLabel,
} from "@/domains/application/billing";
import { hasPermission, requirePermission } from "@/domains/application/rbac";
import {
  createAsaasBillingPlanSource,
  isAsaasBillingCheckoutAvailableForTenant,
} from "@/domains/infrastructure/billing/asaas-runtime";
import { getApplicationContext } from "@/lib/auth/application-context";
import { getPrismaClient } from "@/lib/db";
import { createHostedCheckoutAction } from "./actions";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const feedback: Record<string, string> = {
  "provider-unavailable": "O checkout online está indisponível neste ambiente controlado.",
  "plan-unavailable": "Este plano não está mais disponível para contratação online.",
  "subscription-exists": "Já existe uma assinatura em andamento para esta conta.",
  "checkout-active-other-plan": "Já existe um checkout ativo para outro plano. Conclua ou aguarde a atualização antes de trocar.",
  "payment-sync": "O pagamento foi identificado e está aguardando sincronização segura da assinatura.",
  "in-progress": "A criação do checkout já está em andamento. Aguarde a atualização antes de tentar novamente.",
  reconciliation: "O checkout precisa de reconciliação antes de uma nova tentativa. A equipe de suporte pode verificar o status sem gerar cobrança duplicada.",
  "provider-failed": "O provedor de cobrança não concluiu a operação. Nenhuma nova tentativa automática foi criada.",
  denied: "Seu perfil não possui permissão para iniciar uma contratação.",
  "invalid-request": "A solicitação de checkout não pôde ser validada.",
  failed: "Não foi possível iniciar o checkout. Tente novamente mais tarde.",
};

export default async function SubscriptionSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const context = await getApplicationContext();
  requirePermission(context.membershipRole, "subscription.read");
  const prisma = getPrismaClient();
  const [subscription, payments, checkout, plans, query] = await Promise.all([
    prisma.subscription.findFirst({
      where: { tenantId: context.tenantId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { dueAt: "desc" },
      take: 10,
    }),
    prisma.billingCheckout.findFirst({
      where: {
        tenantId: context.tenantId,
        status: { in: ["CREATED", "ACTIVE", "PAID", "FAILED"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    createAsaasBillingPlanSource(prisma).listActive(),
    searchParams,
  ]);

  const canCheckout = hasPermission(context.membershipRole, "billing.checkout");
  const runtimeAvailable = isAsaasBillingCheckoutAvailableForTenant(context.tenantSlug);
  const hasEffectiveSubscription = Boolean(
    subscription && ["PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED"].includes(subscription.status),
  );
  const blockingCheckout =
    checkout && ["CREATED", "ACTIVE", "PAID"].includes(checkout.status) ? checkout : null;
  const message = query.checkout ? feedback[query.checkout] : undefined;

  return (
    <main className="space-y-6 p-6">
      <div>
        <Link
          className="text-sm text-muted-foreground underline"
          href={`/${context.tenantSlug}/configuracoes`}
        >
          Voltar às configurações
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Assinatura</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Estes valores se referem à assinatura do FlipSchedule, não aos pagamentos dos pacientes da clínica.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border p-4 text-sm" role="status">
          {message}
        </p>
      ) : null}

      {plans.length === 0 ? (
        <section className="rounded-xl border p-5">
          <h2 className="font-medium">Nenhum plano disponível para checkout online</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A administração precisa habilitar explicitamente preço, ciclo e formas de pagamento compatíveis com o Checkout Asaas antes que um plano possa ser contratado online.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border p-5">
          <h2 className="font-medium">Planos disponíveis</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {plans.map((plan) => {
              const matchingCheckout = blockingCheckout?.planCode === plan.code ? blockingCheckout : null;
              const checkoutForOtherPlan = Boolean(
                blockingCheckout && blockingCheckout.planCode !== plan.code,
              );
              const isCreating = matchingCheckout?.status === "CREATED";
              const isPaid = matchingCheckout?.status === "PAID";
              const canResume = matchingCheckout?.status === "ACTIVE";
              const disabled =
                !canCheckout ||
                !runtimeAvailable ||
                hasEffectiveSubscription ||
                checkoutForOtherPlan ||
                isCreating ||
                isPaid;
              const label = canResume
                ? "Retomar checkout"
                : isCreating
                  ? "Checkout em criação"
                  : isPaid
                    ? "Pagamento em confirmação"
                    : "Iniciar checkout";

              return (
                <div className="rounded-lg border p-4" key={plan.code}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>{plan.displayName}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.cycle === "MONTHLY" ? "Mensal" : "Anual"} ·{" "}
                        {plan.allowedBillingTypes
                          .map((type) =>
                            type === "CREDIT_CARD" ? "Cartão" : type === "BOLETO" ? "Boleto" : "PIX",
                          )
                          .join(", ")}
                      </p>
                    </div>
                    <span className="font-medium">{money(plan.priceCents)}</span>
                  </div>
                  <form action={createHostedCheckoutAction} className="mt-4">
                    <input name="tenantSlug" type="hidden" value={context.tenantSlug} />
                    <input name="planCode" type="hidden" value={plan.code} />
                    <button
                      className="rounded-md border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={disabled}
                    >
                      {label}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
          {!runtimeAvailable ? (
            <p className="mt-3 text-xs text-muted-foreground">
              O efeito externo permanece bloqueado até o ambiente protegido habilitar explicitamente o checkout Asaas para esta conta.
            </p>
          ) : null}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-5">
          <h2 className="font-medium">Situação da assinatura</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt>Plano</dt>
            <dd>{subscription?.planCode ?? "Não contratado"}</dd>
            <dt>Status</dt>
            <dd>{subscription ? subscriptionStatusLabel(subscription.status) : "Sem assinatura"}</dd>
            <dt>Período atual</dt>
            <dd>{subscription?.currentPeriodEnd?.toLocaleDateString("pt-BR") ?? "—"}</dd>
            <dt>Cancelamento agendado</dt>
            <dd>{subscription?.cancelAtPeriodEnd ? "Sim" : "Não"}</dd>
            <dt>Carência</dt>
            <dd>{subscription?.gracePeriodEndsAt?.toLocaleDateString("pt-BR") ?? "Não definida"}</dd>
            <dt>Última sincronização</dt>
            <dd>{subscription?.lastSyncedAt?.toLocaleString("pt-BR") ?? "—"}</dd>
          </dl>
        </div>
        <div className="rounded-xl border p-5">
          <h2 className="font-medium">Checkout hospedado</h2>
          <p className="mt-3 text-sm">
            {checkout ? `Status: ${billingCheckoutStatusLabel(checkout.status)}` : "Nenhum checkout pendente."}
          </p>
          {checkout?.status === "FAILED" ? (
            <p className="mt-2 text-sm text-destructive">
              Não foi possível criar o checkout. Uma nova tentativa só será feita por ação explícita do responsável.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="font-medium">Cobranças recentes da assinatura</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma cobrança registrada.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {payments.map((payment) => (
              <li className="flex justify-between py-3 text-sm" key={payment.id}>
                <span>
                  {payment.dueAt.toLocaleDateString("pt-BR")} · {paymentStatusLabel(payment.status)}
                </span>
                <strong>{money(payment.amountCents)}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
