import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { PlatformOperationsReader } from "@/domains/infrastructure/platform/operations";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";
import { requeuePlatformOperationAction } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const feedback: Record<string, string> = {
  requeued: "Operação recolocada na fila. O worker fará o processamento assíncrono.",
  "not-found": "A operação não foi encontrada.",
  "not-retryable": "A operação não está em um estado elegível para reprocessamento.",
  conflict: "O estado da operação mudou durante a solicitação. Atualize a página.",
  "access-denied": "Seu papel não permite reprocessar operações.",
  invalid: "Não foi possível concluir. Revise a confirmação e o motivo.",
  unavailable: "O serviço está temporariamente indisponível.",
};

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  RECEIVED: "Recebido",
  PROCESSING: "Processando",
  FAILED: "Falhou",
};

const providerLabel: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  MESSENGER: "Messenger",
  FACEBOOK_LEADS: "Facebook Leads",
  ASAAS: "Asaas",
  EMAIL: "E-mail",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type SearchParams = {
  q?: string;
  queue?: string;
  status?: string;
  provider?: string;
  page?: string;
  result?: string;
};

function directoryHref(
  filters: { q: string; queue: string; status: string; provider: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.queue !== "ALL") params.set("queue", filters.queue);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.provider !== "ALL") params.set("provider", filters.provider);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/operations?${query}` : "/admin/operations";
}

function count(rows: readonly { status: string; _count: number }[], status: string) {
  return rows.find((row) => row.status === status)?._count ?? 0;
}

export default async function PlatformOperationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  noStore();
  const [context, raw] = await Promise.all([getPlatformContext(), searchParams]);
  const data = await new PlatformOperationsReader(getPrismaClient()).read(context, raw);
  const message = raw.result ? feedback[raw.result] : undefined;
  const returnTo = directoryHref(data.filters, data.page);
  const allowlist = (process.env.PILOT_TENANT_SLUGS ?? "").split(",").filter(Boolean);
  const diagnosis = [
    ["Ambiente", process.env.APP_ENV ?? "Não configurado"],
    ["Modo operacional", process.env.OPERATIONAL_MODE ?? "Não configurado"],
    ["Efeitos externos", process.env.EXTERNAL_EFFECTS_MODE ?? "Não configurado"],
    ["Pilot mode", process.env.PILOT_MODE ?? "Não configurado"],
    ["Tenants permitidos", String(allowlist.length)],
  ] as const;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Runtime assíncrono</p>
        <h1 className="mt-2 font-display text-4xl">Operações</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Acompanhe filas de mensagens e webhooks sem carregar conteúdo, payload, credenciais ou
          identificadores externos. O reprocessamento apenas altera o estado da fila; nenhuma integração
          é chamada por esta página.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <section className="card-surface p-5" aria-labelledby="runtime-title">
        <h2 id="runtime-title" className="font-display text-2xl">Diagnóstico do runtime</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {diagnosis.map(([label, value]) => (
            <div className="rounded-md border border-line p-3" key={label}>
              <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
              <dd className="mt-1 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" aria-label="Resumo das filas">
        <SummaryCard label="Mensagens pendentes" value={count(data.summary.messageStatusGroups, "PENDING")} />
        <SummaryCard label="Mensagens processando" value={count(data.summary.messageStatusGroups, "PROCESSING")} />
        <SummaryCard label="Mensagens com falha" value={count(data.summary.messageStatusGroups, "FAILED")} />
        <SummaryCard label="Webhooks recebidos" value={count(data.summary.webhookStatusGroups, "RECEIVED")} />
        <SummaryCard label="Webhooks processando" value={count(data.summary.webhookStatusGroups, "PROCESSING")} />
        <SummaryCard label="Webhooks com falha" value={count(data.summary.webhookStatusGroups, "FAILED")} />
      </section>

      <form className="card-surface grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]" method="get">
        <label className="text-sm font-medium">
          Buscar
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={data.filters.q}
            maxLength={120}
            name="q"
            placeholder="Clínica, correlação ou código de falha"
          />
        </label>
        <label className="text-sm font-medium">
          Fila
          <select className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.queue} name="queue">
            <option value="ALL">Todas</option>
            <option value="MESSAGES">Mensagens</option>
            <option value="WEBHOOKS">Webhooks</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Status
          <select className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.status} name="status">
            <option value="ALL">Todos</option>
            {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Provider
          <select className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.provider} name="provider">
            <option value="ALL">Todos</option>
            {Object.entries(providerLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="min-h-11 self-end rounded-md bg-primary px-5 font-medium text-primary-foreground">Filtrar</button>
      </form>

      <QueueSection
        empty="Nenhuma mensagem corresponde aos filtros."
        returnTo={returnTo}
        rows={data.messages.map((row) => ({
          id: row.id,
          displayId: row.displayId ?? row.id,
          type: "MESSAGE" as const,
          tenant: row.tenant,
          displayTenantId: row.displayTenantId,
          provider: row.provider,
          channel: row.conversation.channel,
          status: row.status,
          attempts: row.attempts,
          nextAttemptAt: row.nextAttemptAt,
          processingStartedAt: row.processingStartedAt,
          lastErrorCode: row.lastErrorCode,
          correlationId: row.correlationId,
          updatedAt: row.updatedAt,
          retryable: row.retryable,
        }))}
        title={`Mensagens de saída · ${data.totals.messages}`}
      />

      <QueueSection
        empty="Nenhum webhook corresponde aos filtros."
        returnTo={returnTo}
        rows={data.webhooks.map((row) => ({
          id: row.id,
          displayId: row.displayId ?? row.id,
          type: "WEBHOOK" as const,
          tenant: row.tenant,
          displayTenantId: row.displayTenantId,
          provider: row.provider,
          channel: null,
          status: row.status,
          attempts: row.attempts,
          nextAttemptAt: row.nextAttemptAt,
          processingStartedAt: row.processingStartedAt,
          lastErrorCode: row.lastErrorCode,
          correlationId: row.correlationId,
          updatedAt: row.updatedAt,
          retryable: row.retryable,
        }))}
        title={`Webhooks · ${data.totals.webhooks}`}
      />

      <nav className="flex items-center justify-between gap-4" aria-label="Paginação das operações">
        {data.page > 1 ? (
          <Link className="rounded-md border border-line px-4 py-2 text-sm" href={directoryHref(data.filters, data.page - 1)}>Página anterior</Link>
        ) : <span />}
        <span className="text-sm text-ink-muted">Página {data.page} de {data.totalPages}</span>
        {data.page < data.totalPages ? (
          <Link className="rounded-md border border-line px-4 py-2 text-sm" href={directoryHref(data.filters, data.page + 1)}>Próxima página</Link>
        ) : <span />}
      </nav>
    </div>
  );
}

type QueueRow = {
  id: string;
  displayId: string;
  type: "MESSAGE" | "WEBHOOK";
  tenant: { name: string; slug: string } | null;
  displayTenantId: string | null;
  provider: string | null;
  channel: string | null;
  status: string;
  attempts: number;
  nextAttemptAt: Date | null;
  processingStartedAt: Date | null;
  lastErrorCode: string | null;
  correlationId: string | null;
  updatedAt: Date;
  retryable: boolean;
};

function QueueSection({ title, rows, empty, returnTo }: { title: string; rows: QueueRow[]; empty: string; returnTo: string }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-4 space-y-4">
        {rows.length === 0 ? <p className="card-surface p-5 text-sm text-ink-muted">{empty}</p> : rows.map((row) => (
          <article className="card-surface p-5" key={`${row.type}-${row.id}`}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(110px,auto))]">
              <div>
                <p className="font-mono text-xs text-ink-muted">{row.type} · {row.displayId}</p>
                <p className="mt-1 font-medium">{row.tenant?.name ?? "Tenant não resolvido"}</p>
                <p className="text-xs text-ink-dim">{row.tenant?.slug ?? row.displayTenantId ?? "sem tenant"}</p>
              </div>
              <Detail label="Status" value={statusLabel[row.status] ?? row.status} />
              <Detail label="Provider" value={row.provider ? providerLabel[row.provider] ?? row.provider : "—"} />
              <Detail label="Tentativas" value={String(row.attempts)} />
              <Detail label="Atualizado" value={dateTime.format(row.updatedAt)} />
            </div>
            <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Canal" value={row.channel ?? "—"} />
              <Detail label="Correlação protegida" value={row.correlationId ?? "—"} mono />
              <Detail label="Falha" value={row.lastErrorCode ?? "—"} mono />
              <Detail label="Próxima tentativa" value={row.nextAttemptAt ? dateTime.format(row.nextAttemptAt) : row.processingStartedAt ? `Desde ${dateTime.format(row.processingStartedAt)}` : "—"} />
            </dl>
            {row.retryable ? (
              <form action={requeuePlatformOperationAction} className="mt-4 grid gap-3 border-t border-line pt-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                <input name="operationId" type="hidden" value={row.id} />
                <input name="operationType" type="hidden" value={row.type} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <label className="text-sm font-medium">
                  Motivo do reprocessamento
                  <input className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3" maxLength={500} minLength={10} name="reason" placeholder="Registre a validação realizada" required />
                </label>
                <label className="text-sm font-medium">
                  Confirmação
                  <input className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3 font-mono text-xs" name="confirmation" placeholder="REPROCESSAR" required />
                </label>
                <button className="min-h-10 self-end rounded-md border border-warm/40 px-5 text-sm font-medium">Recolocar na fila</button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="card-surface p-4"><p className="text-xs font-semibold uppercase text-ink-muted">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="text-xs font-semibold text-ink-muted">{label}</dt><dd className={`mt-1 text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}
