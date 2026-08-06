import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { PlatformEmailOperationsReader } from "@/domains/infrastructure/platform/email-operations";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";
import { liftEmailSuppressionAction } from "./actions";

export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  "suppression-lifted": "Suppression liberada. O próximo envio legítimo poderá ser processado novamente.",
  "suppression-not-found": "A suppression não foi encontrada.",
  "suppression-already-lifted": "Essa suppression já havia sido liberada.",
  "access-denied": "Seu papel não permite alterar suppressions.",
  invalid: "Não foi possível concluir. Revise a confirmação e o motivo.",
  unavailable: "O serviço está temporariamente indisponível.",
};

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  DELIVERED: "Entregue",
  DELIVERY_DELAYED: "Entrega atrasada",
  BOUNCED: "Bounce",
  COMPLAINED: "Reclamação",
  SUPPRESSED: "Suprimido",
  FAILED: "Falhou",
};

const kindLabel: Record<string, string> = {
  PASSWORD_RESET: "Recuperação de senha",
  EMAIL_VERIFICATION: "Verificação de e-mail",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type SearchParams = {
  q?: string;
  status?: string;
  kind?: string;
  page?: string;
  result?: string;
};

function directoryHref(
  filters: { q: string; status: string; kind: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.kind !== "ALL") params.set("kind", filters.kind);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/email?${query}` : "/admin/email";
}

function count(
  rows: readonly { status?: string; kind?: string; _count: number }[],
  field: "status" | "kind",
  value: string,
) {
  return rows.find((row) => row[field] === value)?._count ?? 0;
}

export default async function PlatformEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  noStore();
  const [context, raw] = await Promise.all([getPlatformContext(), searchParams]);
  const reader = new PlatformEmailOperationsReader(getPrismaClient());
  const data = await reader.read(context, raw);
  const message = raw.result ? feedback[raw.result] : undefined;
  const returnTo = directoryHref(data.filters, data.page);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Comunicação transacional</p>
        <h1 className="mt-2 font-display text-4xl">Operação de e-mail</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Diagnóstico sanitizado do Resend, entregas, webhooks e suppressions. Nenhuma chave,
          endereço completo, corpo da mensagem ou token é carregado nesta tela.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <section className="card-surface p-5" aria-labelledby="email-readiness-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="email-readiness-title" className="font-display text-2xl">
              Prontidão do provider
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Provider: {data.readiness.provider} · efeitos externos: {data.readiness.externalEffectsMode}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <StatusPill ok={data.readiness.valid} label="Configuração válida" />
            <StatusPill ok={data.readiness.readyToSend} label="Pronto para enviar" />
            <StatusPill ok={data.readiness.readyForWebhook} label="Webhook pronto" />
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ReadinessItem label="API key" ok={data.readiness.checks.apiKeyConfigured} />
          <ReadinessItem label="Remetente" ok={data.readiness.checks.senderConfigured} />
          <ReadinessItem label="Reply-to" ok={data.readiness.checks.replyToConfigured} />
          <ReadinessItem label="Webhook secret" ok={data.readiness.checks.webhookConfigured} />
          <ReadinessItem label="Chave de fingerprint" ok={data.readiness.checks.recipientHashConfigured} />
          <ReadinessItem label="Efeitos externos" ok={data.readiness.checks.externalEffectsEnabled} />
        </dl>
        <p className="mt-4 text-xs text-ink-dim">
          O código não configura domínio, DNS, API key ou webhook no Resend. Esses passos permanecem
          protegidos no runbook de ativação.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo de e-mails">
        <SummaryCard label="Entregues" value={count(data.summary.statusGroups, "status", "DELIVERED")} />
        <SummaryCard label="Falhas" value={count(data.summary.statusGroups, "status", "FAILED")} />
        <SummaryCard label="Bounces" value={count(data.summary.statusGroups, "status", "BOUNCED")} />
        <SummaryCard label="Suppressions ativas" value={data.summary.activeSuppressions} />
        <SummaryCard label="Webhooks com falha" value={data.summary.webhookFailures} />
      </section>

      <form className="card-surface grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_230px_auto]" method="get">
        <label className="text-sm font-medium">
          Buscar
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={data.filters.q}
            maxLength={120}
            name="q"
            placeholder="Fingerprint, provider ou código de falha"
          />
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={data.filters.status}
            name="status"
          >
            <option value="ALL">Todos</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Tipo
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={data.filters.kind}
            name="kind"
          >
            <option value="ALL">Todos</option>
            {Object.entries(kindLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button className="min-h-11 self-end rounded-md bg-primary px-5 font-medium text-primary-foreground">
          Filtrar
        </button>
      </form>

      <section aria-labelledby="deliveries-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="deliveries-title" className="font-display text-2xl">Entregas transacionais</h2>
            <p className="mt-1 text-sm text-ink-muted">{data.total} registro(s) encontrado(s).</p>
          </div>
          <Link className="text-sm font-medium text-primary" href="/admin/operations">
            Abrir operações gerais
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="p-3">Tipo</th>
                <th className="p-3">Status</th>
                <th className="p-3">Destinatário protegido</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Último evento</th>
                <th className="p-3">Falha</th>
              </tr>
            </thead>
            <tbody>
              {data.deliveries.length === 0 ? (
                <tr><td className="p-6 text-ink-muted" colSpan={6}>Nenhuma entrega corresponde aos filtros.</td></tr>
              ) : (
                data.deliveries.map((delivery) => (
                  <tr className="border-t border-line" key={delivery.id}>
                    <td className="p-3">{kindLabel[delivery.kind] ?? delivery.kind}</td>
                    <td className="p-3">{statusLabel[delivery.status] ?? delivery.status}</td>
                    <td className="p-3 font-mono text-xs">{delivery.recipientFingerprint}</td>
                    <td className="p-3">{delivery.provider}</td>
                    <td className="p-3">{dateTime.format(delivery.lastEventAt ?? delivery.updatedAt)}</td>
                    <td className="p-3 font-mono text-xs">{delivery.failureCode ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="suppressions-title">
        <h2 id="suppressions-title" className="font-display text-2xl">Suppressions ativas</h2>
        <p className="mt-1 text-sm text-ink-muted">
          A liberação não envia mensagem automaticamente. Ela apenas permite uma nova tentativa iniciada
          por um fluxo legítimo, como recuperação ou verificação de e-mail.
        </p>
        <div className="mt-4 space-y-4">
          {data.suppressions.length === 0 ? (
            <p className="card-surface p-5 text-sm text-ink-muted">Nenhuma suppression ativa.</p>
          ) : (
            data.suppressions.map((suppression) => (
              <article className="card-surface p-5" key={suppression.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm">{suppression.recipientFingerprint}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {suppression.provider} · {suppression.reason} · criada em {dateTime.format(suppression.createdAt)}
                    </p>
                  </div>
                </div>
                <form action={liftEmailSuppressionAction} className="mt-4 grid gap-3 border-t border-line pt-4 lg:grid-cols-[minmax(0,1fr)_230px_auto]">
                  <input name="suppressionId" type="hidden" value={suppression.id} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <label className="text-sm font-medium">
                    Motivo da liberação
                    <input
                      className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3"
                      maxLength={500}
                      minLength={10}
                      name="reason"
                      placeholder="Registre a validação realizada"
                      required
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Confirmação
                    <input
                      className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3 font-mono text-xs"
                      name="confirmation"
                      placeholder="LIBERAR EMAIL"
                      required
                    />
                  </label>
                  <button className="min-h-10 self-end rounded-md border border-warm/40 px-5 text-sm font-medium">
                    Liberar suppression
                  </button>
                </form>
              </article>
            ))
          )}
        </div>
      </section>

      <section aria-labelledby="webhooks-title">
        <h2 id="webhooks-title" className="font-display text-2xl">Eventos recentes do webhook</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface"><tr><th className="p-3">Evento</th><th className="p-3">Provider</th><th className="p-3">Ocorrido</th><th className="p-3">Processamento</th><th className="p-3">Falha</th></tr></thead>
            <tbody>
              {data.recentWebhookEvents.length === 0 ? (
                <tr><td className="p-6 text-ink-muted" colSpan={5}>Nenhum evento recebido.</td></tr>
              ) : (
                data.recentWebhookEvents.map((event) => (
                  <tr className="border-t border-line" key={event.id}>
                    <td className="p-3">{event.eventType}</td>
                    <td className="p-3">{event.provider}</td>
                    <td className="p-3">{dateTime.format(event.eventOccurredAt ?? event.createdAt)}</td>
                    <td className="p-3">{event.processedAt ? dateTime.format(event.processedAt) : "Pendente"}</td>
                    <td className="p-3 font-mono text-xs">{event.failureCode ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="flex items-center justify-between gap-4" aria-label="Paginação de e-mails">
        {data.page > 1 ? (
          <Link className="rounded-md border border-line px-4 py-2 text-sm" href={directoryHref(data.filters, data.page - 1)}>
            Página anterior
          </Link>
        ) : <span />}
        <span className="text-sm text-ink-muted">Página {data.page} de {data.totalPages}</span>
        {data.page < data.totalPages ? (
          <Link className="rounded-md border border-line px-4 py-2 text-sm" href={directoryHref(data.filters, data.page + 1)}>
            Próxima página
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="card-surface p-4"><p className="text-xs font-semibold uppercase text-ink-muted">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className="rounded-full border border-line px-3 py-1">{ok ? "OK" : "Pendente"} · {label}</span>;
}

function ReadinessItem({ label, ok }: { label: string; ok: boolean }) {
  return <div className="rounded-md border border-line p-3"><dt className="text-xs font-semibold text-ink-muted">{label}</dt><dd className="mt-1 text-sm">{ok ? "Configurado" : "Pendente"}</dd></div>;
}
