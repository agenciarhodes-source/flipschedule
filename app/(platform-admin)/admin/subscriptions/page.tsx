import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { PlatformSubscriptionDirectoryReader } from "@/domains/infrastructure/platform/subscription-directory-reader";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";
import { changeManualSubscriptionStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  "status-updated": "Status da assinatura manual atualizado e acesso sincronizado.",
  "subscription-not-found": "A assinatura não foi encontrada.",
  "external-read-only": "Assinaturas externas são atualizadas apenas pelo provider e pela reconciliação.",
  "tenant-archived": "Uma clínica arquivada não pode ter a assinatura reativada.",
  "confirmation-required": "Para cancelar, digite exatamente CANCELAR ASSINATURA.",
  "access-denied": "Seu papel não permite administrar assinaturas.",
  invalid: "Não foi possível concluir. Revise os dados e tente novamente.",
  unavailable: "O serviço está temporariamente indisponível.",
};

const subscriptionStatusLabel: Record<string, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativa",
  PAST_DUE: "Em atraso",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
};

const paymentStatusLabel: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  RECEIVED: "Recebido",
  OVERDUE: "Em atraso",
  REFUNDED: "Estornado",
  CANCELLED: "Cancelado",
  FAILED: "Falhou",
};

const entitlementTypeLabel: Record<string, string> = {
  TRIAL: "Teste",
  PAID: "Pago",
  COURTESY: "Cortesia",
  INTERNAL: "Interno",
};

const providerLabel: Record<string, string> = {
  MANUAL: "Manual",
  ASAAS: "Asaas",
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type SearchParams = {
  q?: string;
  status?: string;
  provider?: string;
  page?: string;
  result?: string;
};

function directoryHref(
  filters: { q: string; status: string; provider: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.provider !== "ALL") params.set("provider", filters.provider);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/subscriptions?${query}` : "/admin/subscriptions";
}

function statusCount(
  rows: readonly { status: string; _count: number }[],
  status: string,
) {
  return rows.find((row) => row.status === status)?._count ?? 0;
}

export default async function PlatformSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  noStore();
  const [context, raw] = await Promise.all([getPlatformContext(), searchParams]);
  const reader = new PlatformSubscriptionDirectoryReader(getPrismaClient());
  const directory = await reader.read(context, {
    page: raw.page,
    q: raw.q,
    status: raw.status,
    provider: raw.provider,
  });
  const message = raw.result ? feedback[raw.result] : undefined;
  const returnTo = directoryHref(directory.filters, directory.page);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Cobrança e acesso</p>
        <h1 className="mt-2 font-display text-4xl">Assinaturas da plataforma</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Acompanhe planos, períodos, pagamentos e entitlements sem expor identificadores externos.
          Assinaturas Asaas permanecem somente leitura; alterações manuais são auditadas no servidor.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo de assinaturas">
        <SummaryCard label="Ativas" value={statusCount(directory.summary.subscriptions, "ACTIVE")} />
        <SummaryCard label="Em atraso" value={statusCount(directory.summary.subscriptions, "PAST_DUE")} />
        <SummaryCard label="Suspensas" value={statusCount(directory.summary.subscriptions, "SUSPENDED")} />
        <SummaryCard label="Pagamentos vencidos" value={directory.summary.overduePayments} />
        <SummaryCard label="Acessos vigentes" value={directory.summary.activeEntitlements} />
      </section>

      <form className="card-surface grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]" method="get">
        <label className="text-sm font-medium">
          Buscar
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={directory.filters.q}
            maxLength={120}
            name="q"
            placeholder="Clínica, slug, plano ou código"
          />
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={directory.filters.status}
            name="status"
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendentes</option>
            <option value="ACTIVE">Ativas</option>
            <option value="PAST_DUE">Em atraso</option>
            <option value="SUSPENDED">Suspensas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="EXPIRED">Expiradas</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Provider
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={directory.filters.provider}
            name="provider"
          >
            <option value="ALL">Todos</option>
            <option value="MANUAL">Manual</option>
            <option value="ASAAS">Asaas</option>
          </select>
        </label>
        <button className="min-h-11 self-end rounded-md bg-primary px-5 font-medium text-primary-foreground">
          Filtrar
        </button>
      </form>

      <section aria-labelledby="subscription-directory-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="subscription-directory-title" className="font-display text-2xl">
              Diretório financeiro
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {directory.total} assinatura(s) encontrada(s).
            </p>
          </div>
          <Link className="text-sm font-medium text-primary" href="/admin/clients">
            Alterar plano ou administrar clínica
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {directory.rows.length === 0 ? (
            <p className="card-surface p-6 text-sm text-ink-muted">
              Nenhuma assinatura corresponde aos filtros informados.
            </p>
          ) : (
            directory.rows.map((subscription) => {
              const plan = subscription.commercialPlan;
              const isManual = subscription.provider === "MANUAL";
              return (
                <article className="card-surface p-5" key={subscription.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-2xl">{subscription.tenant.name}</h3>
                      <p className="mt-1 font-mono text-xs text-ink-muted">/{subscription.tenant.slug}</p>
                      <p className="mt-3 text-sm text-ink-muted">
                        {plan?.name ?? subscription.planCode} · {providerLabel[subscription.provider] ?? subscription.provider}
                        {plan ? ` · ${money.format(plan.priceCents / 100)}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-ink-dim">
                        Criada em {dateTime.format(subscription.createdAt)} · atualizada em {dateTime.format(subscription.updatedAt)}
                        {subscription.lastSyncedAt ? ` · sincronizada em ${dateTime.format(subscription.lastSyncedAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full border border-line px-3 py-1">
                        {subscriptionStatusLabel[subscription.status] ?? subscription.status}
                      </span>
                      <span className="rounded-full border border-line px-3 py-1">
                        {providerLabel[subscription.provider] ?? subscription.provider}
                      </span>
                      <span className="rounded-full border border-line px-3 py-1">
                        Clínica {subscription.tenant.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <InfoPanel title="Período">
                      <p>Início: {subscription.currentPeriodStart ? date.format(subscription.currentPeriodStart) : "não informado"}</p>
                      <p>Fim: {subscription.currentPeriodEnd ? date.format(subscription.currentPeriodEnd) : "sem expiração automática"}</p>
                      <p>{subscription.cancelAtPeriodEnd ? "Cancelamento agendado" : "Sem cancelamento agendado"}</p>
                      {subscription.gracePeriodEndsAt ? <p>Carência até {date.format(subscription.gracePeriodEndsAt)}</p> : null}
                    </InfoPanel>

                    <InfoPanel title={`Pagamentos (${subscription._count.payments})`}>
                      {subscription.payments.length === 0 ? (
                        <p className="text-ink-muted">Nenhum pagamento registrado.</p>
                      ) : (
                        <ul className="space-y-2">
                          {subscription.payments.map((payment) => (
                            <li key={payment.id}>
                              {money.format(payment.amountCents / 100)} · {paymentStatusLabel[payment.status] ?? payment.status} · vence {date.format(payment.dueAt)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </InfoPanel>

                    <InfoPanel title="Acessos vigentes">
                      {subscription.tenant.entitlements.length === 0 ? (
                        <p className="text-ink-muted">Nenhum entitlement vigente.</p>
                      ) : (
                        <ul className="space-y-2">
                          {subscription.tenant.entitlements.map((entitlement) => (
                            <li key={entitlement.id}>
                              {entitlementTypeLabel[entitlement.type] ?? entitlement.type}
                              {entitlement.endsAt ? ` · até ${date.format(entitlement.endsAt)}` : " · sem expiração automática"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </InfoPanel>
                  </div>

                  {isManual ? (
                    <form action={changeManualSubscriptionStatusAction} className="mt-5 grid gap-4 border-t border-line pt-5 lg:grid-cols-[220px_minmax(0,1fr)_260px_auto]">
                      <input name="subscriptionId" type="hidden" value={subscription.id} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <label className="text-sm font-medium">
                        Novo status
                        <select
                          className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                          defaultValue={subscription.status === "ACTIVE" ? "ACTIVE" : subscription.status === "CANCELLED" ? "CANCELLED" : "SUSPENDED"}
                          name="status"
                        >
                          <option value="ACTIVE">Ativa</option>
                          <option value="SUSPENDED">Suspensa</option>
                          <option value="CANCELLED">Cancelada</option>
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        Motivo operacional
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                          maxLength={500}
                          minLength={10}
                          name="reason"
                          placeholder="Mínimo de 10 caracteres"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Confirmação ao cancelar
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3 font-mono text-xs"
                          name="confirmation"
                          placeholder="CANCELAR ASSINATURA"
                        />
                      </label>
                      <button className="min-h-10 self-end rounded-md border border-line px-5 text-sm font-medium">
                        Atualizar assinatura
                      </button>
                    </form>
                  ) : (
                    <p className="mt-5 rounded-md border border-line bg-bg px-4 py-3 text-sm text-ink-muted">
                      Assinatura externa somente leitura. Mudanças devem chegar pelo webhook assinado ou pela reconciliação do provider.
                    </p>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <nav className="flex items-center justify-between gap-4" aria-label="Paginação de assinaturas">
        {directory.page > 1 ? (
          <Link className="rounded-md border border-line px-4 py-2 text-sm" href={directoryHref(directory.filters, directory.page - 1)}>
            Página anterior
          </Link>
        ) : (
          <span />
        )}
        <span className="text-sm text-ink-muted">
          Página {directory.page} de {directory.totalPages}
        </span>
        {directory.page < directory.totalPages ? (
          <Link className="rounded-md border border-line px-4 py-2 text-sm" href={directoryHref(directory.filters, directory.page + 1)}>
            Próxima página
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-surface p-4">
      <p className="text-xs font-semibold uppercase text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-line p-4 text-sm">
      <h4 className="font-semibold">{title}</h4>
      <div className="mt-3 space-y-1 text-xs text-ink-muted">{children}</div>
    </section>
  );
}
