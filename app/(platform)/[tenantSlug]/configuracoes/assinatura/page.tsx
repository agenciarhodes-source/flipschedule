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
import { PLAN_CHANGE_CONFIRMATION } from "@/domains/infrastructure/billing/billing-services";
import { PrismaBillingPlanCatalog } from "@/domains/infrastructure/billing/commercial-billing-catalog";
import { readPendingSubscriptionPlanChange } from "@/domains/infrastructure/billing/plan-change-intent";
import { readCommercialPlanCapacity } from "@/domains/infrastructure/prisma/commercial-plan-quota";
import { getApplicationContext } from "@/lib/auth/application-context";
import { getPrismaClient } from "@/lib/db";
import { changeSubscriptionPlanAction, createHostedCheckoutAction } from "./actions";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const checkoutFeedback: Record<string, string> = {
  "provider-unavailable": "O checkout online está indisponível neste ambiente controlado.",
  "plan-unavailable": "Este plano não está mais disponível para contratação online.",
  "subscription-exists": "Já existe uma assinatura em andamento para esta conta.",
  "checkout-active-other-plan":
    "Já existe um checkout ativo para outro plano. Conclua ou aguarde a atualização antes de trocar.",
  "payment-sync": "O pagamento foi identificado e está aguardando sincronização segura da assinatura.",
  "in-progress": "A criação do checkout já está em andamento. Aguarde a atualização antes de tentar novamente.",
  reconciliation:
    "O checkout precisa de reconciliação antes de uma nova tentativa. A equipe de suporte pode verificar o status sem gerar cobrança duplicada.",
  "provider-failed":
    "O provedor de cobrança não concluiu a operação. Nenhuma nova tentativa automática foi criada.",
  denied: "Seu perfil não possui permissão para iniciar uma contratação.",
  "invalid-request": "A solicitação de checkout não pôde ser validada.",
  failed: "Não foi possível iniciar o checkout. Tente novamente mais tarde.",
};

const planChangeFeedback: Record<string, string> = {
  success: "Plano alterado e sincronizado com sucesso.",
  confirmation: `Confirme a alteração digitando exatamente ${PLAN_CHANGE_CONFIRMATION}.`,
  denied: "Somente o responsável OWNER pode alterar o plano da assinatura.",
  "invalid-request": "A solicitação de alteração de plano não pôde ser validada.",
  "plan-unavailable": "O plano selecionado não está disponível para alteração.",
  "subscription-not-active": "A troca de plano exige uma assinatura Asaas ativa.",
  reconciliation:
    "A alteração ficou em estado de reconciliação. Nenhuma nova tentativa financeira será feita até o estado do Asaas ser confirmado.",
  "cancellation-pending":
    "Cancele o agendamento de encerramento da assinatura antes de alterar o plano.",
  "already-active": "Este já é o plano ativo da assinatura.",
  "in-progress": "Já existe uma alteração de plano aguardando conclusão ou reconciliação.",
  "plan-changed": "O plano comercial mudou durante a solicitação. Revise os valores e tente novamente.",
  capacity:
    "O plano selecionado não comporta o uso atual de unidades ou acessos. Reduza o uso antes do downgrade.",
  "billing-type":
    "A forma de cobrança atual não é compatível com o plano selecionado. Escolha outro plano ou contate o suporte.",
  "provider-unavailable": "O Asaas está indisponível para alteração de plano neste momento.",
  "provider-failed": "O Asaas recusou a alteração. A assinatura local permaneceu no plano anterior.",
  failed: "Não foi possível alterar o plano. Nenhuma nova assinatura foi criada.",
};

export default async function SubscriptionSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; planChange?: string }>;
}) {
  const context = await getApplicationContext();
  requirePermission(context.membershipRole, "subscription.read");
  const prisma = getPrismaClient();
  const [subscription, payments, checkout, checkoutPlans, planChangePlans, capacity, query] =
    await Promise.all([
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
      new PrismaBillingPlanCatalog(prisma).listActive(),
      readCommercialPlanCapacity(prisma, context.tenantId),
      searchParams,
    ]);

  const pendingPlanChange = subscription
    ? await readPendingSubscriptionPlanChange(prisma, context.tenantId, subscription.id)
    : null;
  const canCheckout = hasPermission(context.membershipRole, "billing.checkout");
  const canManagePlan =
    context.membershipRole === "OWNER" && hasPermission(context.membershipRole, "subscription.manage");
  const runtimeAvailable = isAsaasBillingCheckoutAvailableForTenant(context.tenantSlug);
  const hasEffectiveSubscription = Boolean(
    subscription && ["PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED"].includes(subscription.status),
  );
  const canChangePlan = Boolean(
    subscription?.provider === "ASAAS" && subscription.status === "ACTIVE",
  );
  const blockingCheckout =
    checkout && ["CREATED", "ACTIVE", "PAID"].includes(checkout.status) ? checkout : null;
  const message = query.planChange
    ? planChangeFeedback[query.planChange]
    : query.checkout
      ? checkoutFeedback[query.checkout]
      : undefined;

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

      {pendingPlanChange ? (
        <section className="rounded-xl border p-5">
          <h2 className="font-medium">Alteração de plano aguardando reconciliação</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A troca para {pendingPlanChange.metadata.targetPlanCode} ainda está sendo confirmada com o Asaas.
            Novas alterações ficam bloqueadas e o sistema não repete a mutação financeira automaticamente.
          </p>
        </section>
      ) : null}

      {!hasEffectiveSubscription ? (
        checkoutPlans.length === 0 ? (
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
              {checkoutPlans.map((plan) => {
                const matchingCheckout =
                  blockingCheckout?.planCode === plan.code ? blockingCheckout : null;
                const checkoutForOtherPlan = Boolean(
                  blockingCheckout && blockingCheckout.planCode !== plan.code,
                );
                const isCreating = matchingCheckout?.status === "CREATED";
                const isPaid = matchingCheckout?.status === "PAID";
                const canResume = matchingCheckout?.status === "ACTIVE";
                const disabled =
                  !canCheckout ||
                  !runtimeAvailable ||
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
                              type === "CREDIT_CARD"
                                ? "Cartão"
                                : type === "BOLETO"
                                  ? "Boleto"
                                  : "PIX",
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
        )
      ) : (
        <section className="rounded-xl border p-5">
          <h2 className="font-medium">Alterar plano</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A alteração usa a assinatura Asaas existente. Não é criada uma segunda assinatura.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {planChangePlans.map((plan) => {
              const isCurrent = subscription?.planCode === plan.code;
              const clinicLimit = plan.limits.clinics;
              const userLimit = plan.limits.users;
              const clinicsFit = clinicLimit === undefined || capacity.clinics.active <= clinicLimit;
              const usersFit = userLimit === undefined || capacity.users.reserved <= userLimit;
              const capacityFits = clinicsFit && usersFit;
              const disabled =
                isCurrent ||
                !canManagePlan ||
                !canChangePlan ||
                !runtimeAvailable ||
                Boolean(subscription?.cancelAtPeriodEnd) ||
                Boolean(pendingPlanChange) ||
                !capacityFits;

              return (
                <div className="rounded-lg border p-4" key={plan.code}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>{plan.displayName}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.cycle === "MONTHLY" ? "Mensal" : "Anual"} ·{" "}
                        {plan.allowedBillingTypes
                          .map((type) =>
                            type === "CREDIT_CARD"
                              ? "Cartão"
                              : type === "BOLETO"
                                ? "Boleto"
                                : "PIX",
                          )
                          .join(", ")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Unidades: {clinicLimit ?? "ilimitadas"} · Usuários: {userLimit ?? "ilimitados"}
                      </p>
                    </div>
                    <span className="font-medium">{money(plan.priceCents)}</span>
                  </div>

                  {isCurrent ? (
                    <p className="mt-4 text-sm font-medium">Plano atual</p>
                  ) : (
                    <form action={changeSubscriptionPlanAction} className="mt-4 space-y-2">
                      <input name="tenantSlug" type="hidden" value={context.tenantSlug} />
                      <input name="planCode" type="hidden" value={plan.code} />
                      <input
                        aria-label={`Confirmação para alterar para ${plan.displayName}`}
                        className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                        disabled={disabled}
                        name="confirmation"
                        placeholder={`Digite ${PLAN_CHANGE_CONFIRMATION}`}
                        required
                      />
                      <button
                        className="rounded-md border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={disabled}
                      >
                        Alterar para este plano
                      </button>
                      {!capacityFits ? (
                        <p className="text-xs text-destructive">
                          Este plano não comporta o uso atual de unidades ou acessos.
                        </p>
                      ) : null}
                    </form>
                  )}
                </div>
              );
            })}
          </div>
          {!canChangePlan ? (
            <p className="mt-3 text-xs text-muted-foreground">
              A troca self-service está disponível somente para assinatura Asaas ativa.
            </p>
          ) : null}
          {!canManagePlan ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Somente o responsável OWNER pode confirmar uma alteração de plano.
            </p>
          ) : null}
          {!runtimeAvailable ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Alterações financeiras permanecem bloqueadas até o ambiente Asaas estar autorizado para esta conta.
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
            {checkout
              ? `Status: ${billingCheckoutStatusLabel(checkout.status)}`
              : "Nenhum checkout pendente."}
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
