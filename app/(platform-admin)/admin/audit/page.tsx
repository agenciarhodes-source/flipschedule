import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { PlatformAuditDirectoryReader } from "@/domains/infrastructure/platform/audit-directory";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const outcomeLabel: Record<string, string> = {
  SUCCESS: "Sucesso",
  DENIED: "Negado",
  FAILED: "Falhou",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type SearchParams = {
  q?: string;
  outcome?: string;
  action?: string;
  page?: string;
};

function directoryHref(filters: { q: string; outcome: string; action: string }, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.outcome !== "ALL") params.set("outcome", filters.outcome);
  if (filters.action) params.set("action", filters.action);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/audit?${query}` : "/admin/audit";
}

function count(rows: readonly { outcome: string; _count: number }[], outcome: string) {
  return rows.find((row) => row.outcome === outcome)?._count ?? 0;
}

export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  noStore();
  const [context, raw] = await Promise.all([getPlatformContext(), searchParams]);
  const data = await new PlatformAuditDirectoryReader(getPrismaClient()).read(context, raw);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Rastreabilidade administrativa</p>
        <h1 className="mt-2 font-display text-4xl">Auditoria</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Consulte ações administrativas e operacionais com metadados sanitizados. Segredos,
          credenciais, payloads, corpos de mensagem, contatos e conteúdo clínico não são carregados.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumo de auditoria">
        <SummaryCard label="Sucessos" value={count(data.summary.outcomeGroups, "SUCCESS")} />
        <SummaryCard label="Negados" value={count(data.summary.outcomeGroups, "DENIED")} />
        <SummaryCard label="Falhas" value={count(data.summary.outcomeGroups, "FAILED")} />
      </section>

      <section className="card-surface p-5" aria-labelledby="frequent-actions-title">
        <h2 id="frequent-actions-title" className="font-display text-2xl">Ações mais frequentes</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.summary.recentActions.length === 0 ? (
            <span className="text-sm text-ink-muted">Nenhuma ação registrada.</span>
          ) : data.summary.recentActions.map((row) => (
            <Link
              className="rounded-full border border-line px-3 py-1 text-xs hover:border-primary"
              href={directoryHref({ ...data.filters, action: row.action }, 1)}
              key={row.action}
            >
              {row.action} · {row._count}
            </Link>
          ))}
        </div>
      </section>

      <form className="card-surface grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_minmax(260px,1fr)_auto]" method="get">
        <label className="text-sm font-medium">
          Buscar
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3"
            defaultValue={data.filters.q}
            maxLength={120}
            name="q"
            placeholder="Ação, recurso, clínica, ator ou correlação"
          />
        </label>
        <label className="text-sm font-medium">
          Resultado
          <select className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.outcome} name="outcome">
            <option value="ALL">Todos</option>
            {Object.entries(outcomeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Ação
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3 font-mono text-xs"
            defaultValue={data.filters.action}
            maxLength={120}
            name="action"
            placeholder="platform.operation.message_requeued"
          />
        </label>
        <button className="min-h-11 self-end rounded-md bg-primary px-5 font-medium text-primary-foreground">Filtrar</button>
      </form>

      <section aria-labelledby="audit-events-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="audit-events-title" className="font-display text-2xl">Eventos</h2>
            <p className="mt-1 text-sm text-ink-muted">{data.total} registro(s) encontrado(s).</p>
          </div>
          <Link className="text-sm font-medium text-primary" href="/admin/operations">Abrir operações</Link>
        </div>
        <div className="mt-4 space-y-4">
          {data.rows.length === 0 ? (
            <p className="card-surface p-5 text-sm text-ink-muted">Nenhum evento corresponde aos filtros.</p>
          ) : data.rows.map((row) => (
            <article className="card-surface p-5" key={row.id}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_160px_180px]">
                <div>
                  <p className="font-mono text-xs text-ink-muted">{row.displayId}</p>
                  <h3 className="mt-1 break-all font-medium">{row.action}</h3>
                  <p className="mt-1 text-xs text-ink-dim">{row.resourceType} · {row.resourceId ?? "sem recurso"}</p>
                </div>
                <Detail label="Resultado" value={outcomeLabel[row.outcome] ?? row.outcome} />
                <Detail label="Ocorrido" value={dateTime.format(row.occurredAt)} />
                <Detail label="Tenant" value={row.tenant?.name ?? row.displayTenantId ?? "Plataforma"} />
              </div>
              <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Ator" value={row.actorUser?.displayName ?? row.actorUserId ?? "Sistema"} />
                <Detail label="Membership" value={row.actorMembershipId ?? "—"} mono />
                <Detail label="Correlação protegida" value={row.correlationId ?? "—"} mono />
                <Detail label="Tenant slug" value={row.tenant?.slug ?? "—"} mono />
              </dl>
              {row.metadata ? (
                <dl className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {Object.entries(row.metadata).map(([key, value]) => (
                    <div className="rounded-md border border-line px-3 py-2" key={key}>
                      <dt className="font-mono text-[10px] uppercase text-ink-muted">{key}</dt>
                      <dd className="mt-1 max-w-md break-all text-xs">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <nav className="flex items-center justify-between gap-4" aria-label="Paginação da auditoria">
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="card-surface p-4"><p className="text-xs font-semibold uppercase text-ink-muted">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="text-xs font-semibold text-ink-muted">{label}</dt><dd className={`mt-1 break-all text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}
