import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { PlatformOperationsReader } from "@/domains/infrastructure/platform/operations-reader";
import { getPlatformContext } from "@/lib/auth/platform-context";
import { getPrismaClient } from "@/lib/db";

export const dynamic = "force-dynamic";

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
  page?: string;
  outcome?: string;
  action?: string;
  resourceType?: string;
  tenantId?: string;
  q?: string;
};

function href(
  filters: { outcome: string; action: string; resourceType: string; tenantId: string; q: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (filters.outcome !== "ALL") params.set("outcome", filters.outcome);
  if (filters.action) params.set("action", filters.action);
  if (filters.resourceType) params.set("resourceType", filters.resourceType);
  if (filters.tenantId) params.set("tenantId", filters.tenantId);
  if (filters.q) params.set("q", filters.q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/audit?${query}` : "/admin/audit";
}

export default async function PlatformAuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  noStore();
  const [context, raw] = await Promise.all([getPlatformContext(), searchParams]);
  const data = await new PlatformOperationsReader(getPrismaClient()).audit(context, raw);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase text-primary">Rastreabilidade</p>
        <h1 className="mt-2 font-display text-4xl">Auditoria</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">
          Consulte eventos administrativos e operacionais por resultado, ação, recurso, tenant e correlação. Metadados livres, payloads e conteúdo clínico não são exibidos.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo da auditoria">
        {(["SUCCESS", "DENIED", "FAILED"] as const).map((outcome) => (
          <div className="card-surface p-4" key={outcome}>
            <p className="text-xs text-ink-muted">{outcomeLabel[outcome]}</p>
            <p className="mt-2 font-display text-3xl">{data.outcomes.find((item) => item.outcome === outcome)?._count ?? 0}</p>
          </div>
        ))}
      </section>

      <form className="card-surface grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6" method="get">
        <label className="text-sm font-medium">Resultado<select className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.outcome} name="outcome"><option value="ALL">Todos</option><option value="SUCCESS">Sucesso</option><option value="DENIED">Negado</option><option value="FAILED">Falhou</option></select></label>
        <label className="text-sm font-medium">Ação<input className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.action} maxLength={120} name="action" placeholder="platform.user" /></label>
        <label className="text-sm font-medium">Tipo de recurso<input className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.resourceType} maxLength={120} name="resourceType" placeholder="User, Message..." /></label>
        <label className="text-sm font-medium">Tenant ID<input className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3 font-mono text-xs" defaultValue={data.filters.tenantId} maxLength={36} name="tenantId" /></label>
        <label className="text-sm font-medium xl:col-span-1">Busca livre<input className="mt-2 min-h-11 w-full rounded-md border border-line bg-bg px-3" defaultValue={data.filters.q} maxLength={120} name="q" placeholder="recurso ou correlação" /></label>
        <button className="min-h-11 self-end rounded-md bg-primary px-5 font-medium text-primary-foreground">Filtrar</button>
      </form>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-2xl">Eventos encontrados</h2><p className="mt-1 text-sm text-ink-muted">{data.total} registro(s).</p></div><Link className="text-sm font-medium text-primary" href="/admin/operations">Abrir console operacional</Link></div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead><tr><th className="p-3">Data</th><th className="p-3">Ação</th><th className="p-3">Recurso</th><th className="p-3">Resultado</th><th className="p-3">Tenant / ator</th><th className="p-3">Correlação</th></tr></thead>
            <tbody>
              {data.rows.length === 0 ? <tr><td className="p-6 text-ink-muted" colSpan={6}>Nenhum evento corresponde aos filtros.</td></tr> : data.rows.map((row) => (
                <tr className="border-t border-line align-top" key={row.id}>
                  <td className="whitespace-nowrap p-3">{dateTime.format(row.occurredAt)}</td>
                  <td className="p-3 font-mono text-xs">{row.action}</td>
                  <td className="p-3"><p>{row.resourceType}</p><p className="mt-1 font-mono text-xs text-ink-muted">{row.resourceId ?? "—"}</p></td>
                  <td className="p-3"><span className="rounded-full border border-line px-2 py-1 text-xs font-semibold">{outcomeLabel[row.outcome] ?? row.outcome}</span></td>
                  <td className="p-3 font-mono text-xs"><p>T: {row.tenantId ?? "global"}</p><p className="mt-1">A: {row.actorUserId ?? "sistema"}</p></td>
                  <td className="p-3 font-mono text-xs">{row.correlationId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="flex items-center justify-between" aria-label="Paginação da auditoria">{data.page > 1 ? <Link className="rounded-md border border-line px-4 py-2 text-sm" href={href(data.filters, data.page - 1)}>Página anterior</Link> : <span />}<span className="text-sm text-ink-muted">Página {data.page} de {data.totalPages}</span>{data.page < data.totalPages ? <Link className="rounded-md border border-line px-4 py-2 text-sm" href={href(data.filters, data.page + 1)}>Próxima página</Link> : <span />}</nav>
    </div>
  );
}
