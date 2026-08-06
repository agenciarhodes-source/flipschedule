import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { PlatformOperationsReader } from "@/domains/infrastructure/platform/operations-reader";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";
import { retryPlatformOperationAction } from "./actions";

export const dynamic = "force-dynamic";

const feedback: Record<string, string> = {
  "retry-requested": "Reprocessamento solicitado. O worker executará a operação fora desta requisição.",
  "not-found": "A operação não foi encontrada.",
  "not-retryable": "Somente falhas ou processamentos travados há mais de 15 minutos podem ser reabertos.",
  "access-denied": "Seu papel não permite solicitar reprocessamentos.",
  invalid: "Não foi possível concluir. Revise o motivo operacional.",
  unavailable: "O serviço está temporariamente indisponível.",
};

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  FAILED: "Falhou",
  SENT: "Enviada",
  DELIVERED: "Entregue",
  READ: "Lida",
  RECEIVED: "Recebido",
  PROCESSED: "Processado",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type SearchParams = { page?: string; status?: string; tenant?: string; q?: string; result?: string };

function href(filters: { status: string; tenant: string; q: string }, page: number) {
  const params = new URLSearchParams();
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.tenant) params.set("tenant", filters.tenant);
  if (filters.q) params.set("q", filters.q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/operations?${query}` : "/admin/operations";
}

function retryable(status: string, processingStartedAt: Date | null) {
  return status === "FAILED" || (
    status === "PROCESSING" &&
    processingStartedAt !== null &&
    processingStartedAt.getTime() <= Date.now() - 15 * 60 * 1000
  );
}

export default async function PlatformOperationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  noStore();
  const [context, raw] = await Promise.all([getPlatformContext(), searchParams]);
  const data = await new PlatformOperationsReader(getPrismaClient()).operations(context, raw);
  const returnTo = href(data.filters, data.page);
  const message = raw.result ? feedback[raw.result] : undefined;

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Runtime assíncrono</p>
        <h1 className="mt-2 font-display text-4xl">Operações</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Diagnóstico sanitizado de mensagens e webhooks. O painel apenas recoloca itens elegíveis na fila; nenhuma integração externa é chamada pela ação administrativa.
        </p>
      </header>

      {message ? <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm" role="status">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo das filas">
        <div className="card-surface p-4"><p className="text-xs text-ink-muted">Mensagens filtradas</p><p className="mt-2 font-display text-3xl">{data.messageTotal}</p></div>
        <div className="card-surface p-4"><p className="text-xs text-ink-muted">Webhooks filtrados</p><p className="mt-2 font-display text-3xl">{data.webhookTotal}</p></div>
        <div className="card-surface p-4"><p className="text-xs text-ink-muted">Falhas de mensagens</p><p className="mt-2 font-display text-3xl">{data.summary.messages.find((item) => item.status === "FAILED")?._count ?? 0}</p></div>
        <div className="card-surface p-4"><p className="text-xs text-ink-muted">Falhas de webhooks</p><p className="mt-2 font-display text-3xl">{data.summary.webhooks.find((item) => item.status === "FAILED")?._count ?? 0}</p></div>
      </section>

      <form className="card-surface grid gap-4 p-5 lg:grid-cols-[180px_220px_minmax(0,1fr)_auto]" method="get">
        <label className="text-sm font-medium">Status<select className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.status} name="status"><option value="ALL">Todos</option><option value="FAILED">Falhou</option><option value="PROCESSING">Processando</option><option value="PENDING">Pendente</option><option value="RECEIVED">Recebido</option><option value="PROCESSED">Processado</option><option value="SENT">Enviado</option><option value="DELIVERED">Entregue</option></select></label>
        <label className="text-sm font-medium">Tenant<input className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.tenant} maxLength={120} name="tenant" placeholder="slug da clínica" /></label>
        <label className="text-sm font-medium">Correlação ou erro<input className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.q} maxLength={120} name="q" placeholder="correlationId ou código sanitizado" /></label>
        <button className="min-h-11 self-end rounded-md bg-primary px-5 font-medium text-primary-foreground">Filtrar</button>
      </form>

      <section>
        <h2 className="font-display text-2xl">Mensagens de saída</h2>
        <p className="mt-1 text-sm text-ink-muted">{data.messageTotal} registro(s) encontrado(s).</p>
        <div className="mt-4 space-y-3">
          {data.messages.length === 0 ? <p className="card-surface p-5 text-sm text-ink-muted">Nenhuma mensagem corresponde aos filtros.</p> : data.messages.map((row) => (
            <article className="card-surface p-5" key={row.id}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{row.tenant.name}</p><p className="font-mono text-xs text-ink-muted">/{row.tenant.slug} · {row.id}</p></div><span className="rounded-full border border-line px-3 py-1 text-xs font-semibold">{statusLabel[row.status] ?? row.status}</span></div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><dt className="text-xs text-ink-muted">Tentativas</dt><dd>{row.attempts}</dd></div><div><dt className="text-xs text-ink-muted">Criada</dt><dd>{dateTime.format(row.createdAt)}</dd></div><div><dt className="text-xs text-ink-muted">Próxima tentativa</dt><dd>{row.nextAttemptAt ? dateTime.format(row.nextAttemptAt) : "—"}</dd></div><div><dt className="text-xs text-ink-muted">Erro sanitizado</dt><dd className="font-mono text-xs">{row.lastErrorCode ?? "—"}</dd></div></dl>
              {retryable(row.status, row.processingStartedAt) ? <form action={retryPlatformOperationAction} className="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-[minmax(0,1fr)_auto]"><input name="operationType" type="hidden" value="MESSAGE" /><input name="operationId" type="hidden" value={row.id} /><input name="returnTo" type="hidden" value={returnTo} /><label className="text-sm font-medium">Motivo operacional<input className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3" maxLength={500} minLength={10} name="reason" required /></label><button className="min-h-10 self-end rounded-md border border-warm/40 px-4 text-sm font-medium">Solicitar reprocessamento</button></form> : null}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Webhooks recebidos</h2>
        <p className="mt-1 text-sm text-ink-muted">{data.webhookTotal} registro(s) encontrado(s).</p>
        <div className="mt-4 space-y-3">
          {data.webhooks.length === 0 ? <p className="card-surface p-5 text-sm text-ink-muted">Nenhum webhook corresponde aos filtros.</p> : data.webhooks.map((row) => (
            <article className="card-surface p-5" key={row.id}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{row.tenant?.name ?? "Evento global"} · {row.provider}</p><p className="font-mono text-xs text-ink-muted">{row.tenant ? `/${row.tenant.slug}` : "sem tenant"} · {row.id}</p></div><span className="rounded-full border border-line px-3 py-1 text-xs font-semibold">{statusLabel[row.status] ?? row.status}</span></div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><dt className="text-xs text-ink-muted">Tentativas</dt><dd>{row.attempts}</dd></div><div><dt className="text-xs text-ink-muted">Recebido</dt><dd>{dateTime.format(row.receivedAt)}</dd></div><div><dt className="text-xs text-ink-muted">Processado</dt><dd>{row.processedAt ? dateTime.format(row.processedAt) : "—"}</dd></div><div><dt className="text-xs text-ink-muted">Erro sanitizado</dt><dd className="font-mono text-xs">{row.lastErrorCode ?? "—"}</dd></div></dl>
              {retryable(row.status, row.processingStartedAt) ? <form action={retryPlatformOperationAction} className="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-[minmax(0,1fr)_auto]"><input name="operationType" type="hidden" value="WEBHOOK" /><input name="operationId" type="hidden" value={row.id} /><input name="returnTo" type="hidden" value={returnTo} /><label className="text-sm font-medium">Motivo operacional<input className="mt-2 min-h-10 w-full rounded-md border border-line bg-bg px-3" maxLength={500} minLength={10} name="reason" required /></label><button className="min-h-10 self-end rounded-md border border-warm/40 px-4 text-sm font-medium">Solicitar reprocessamento</button></form> : null}
            </article>
          ))}
        </div>
      </section>

      <nav className="flex items-center justify-between" aria-label="Paginação operacional">{data.page > 1 ? <Link className="rounded-md border border-line px-4 py-2 text-sm" href={href(data.filters, data.page - 1)}>Página anterior</Link> : <span />}<span className="text-sm text-ink-muted">Página {data.page} de {data.totalPages}</span>{data.page < data.totalPages ? <Link className="rounded-md border border-line px-4 py-2 text-sm" href={href(data.filters, data.page + 1)}>Próxima página</Link> : <span />}</nav>
    </div>
  );
}
