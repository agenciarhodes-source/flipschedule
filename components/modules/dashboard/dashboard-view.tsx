import { AlertTriangle } from "lucide-react";
import { demoDashboard } from "@/domains/demo";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatting/currency";
import { Eyebrow } from "@/components/shared/eyebrow";
import { PageHeader } from "@/components/shared/page-header";

function metricValue(value: number, format: "currency" | "percentage" | "number") {
  return format === "currency" ? formatCompactCurrency(value) : format === "percentage" ? `${value}%` : String(value);
}

interface DashboardViewProps {
  context?: {
    displayName: string;
    tenantSlug: string;
    membershipRole: string;
  };
}

export function DashboardView({ context }: DashboardViewProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader eyebrow="Visão geral · Setembro 2026" title="Dashboard" description="Indicadores da operação da Clínica Vitalità com dados fictícios e estáticos." />
      <section className="rounded-lg border border-line bg-bg-alt/60 p-5" aria-label="Contexto autenticado">
        <p className="text-sm text-ink-muted">Usuário autenticado</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-display text-2xl">{context?.displayName ?? "Usuário"}</span>
          <span className="rounded-full border border-line px-3 py-1 text-xs uppercase tracking-widest text-ink-dim">{context?.tenantSlug ?? "tenant"}</span>
          <span className="rounded-full border border-line px-3 py-1 text-xs uppercase tracking-widest text-ink-dim">{context?.membershipRole ?? "role"}</span>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">{demoDashboard.metrics.map((m) => <article key={m.label} className="card-surface p-5"><Eyebrow>{m.label}</Eyebrow><p className="mt-3 font-display text-4xl">{metricValue(m.value, m.format)}</p><p className="mt-2 font-mono text-xs text-primary">Δ {m.delta}</p></article>)}</section>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]"><section className="card-surface p-6"><div className="flex items-end justify-between"><div><Eyebrow>Receita</Eyebrow><h2 className="mt-2 font-display text-3xl">{formatCurrency(demoDashboard.revenueCents)}</h2></div><span className="font-mono text-xs text-ink-dim">últimos 7 períodos</span></div><div className="mt-8 flex h-44 items-end gap-3" aria-label="Gráfico de receita">{demoDashboard.revenueSeries.map((v, i) => <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${v}%` }}><span className="sr-only">Período {i + 1}: {v}</span></div>)}</div></section><section className="card-surface p-6"><Eyebrow>Funil comercial</Eyebrow><div className="mt-5 space-y-4">{demoDashboard.funnel.map((x) => <div key={x.label}><div className="flex justify-between text-sm"><span>{x.label}</span><span className="font-mono">{x.value}</span></div><div className="mt-2 h-1.5 rounded bg-bg-elev"><div className="h-full rounded bg-info" style={{ width: `${x.value}%` }} /></div></div>)}</div></section></div>
      <div className="grid gap-6 lg:grid-cols-2"><section className="card-surface p-6"><Eyebrow>Procedimentos</Eyebrow><div className="mt-4 divide-y divide-line">{demoDashboard.procedures.map((p) => <div key={p.name} className="flex justify-between py-3 text-sm"><span>{p.name}</span><span className="font-mono text-ink-muted">{p.count}</span></div>)}</div></section><section className="card-surface p-6"><Eyebrow>Alertas operacionais</Eyebrow><ul className="mt-4 space-y-3">{demoDashboard.alerts.map((a) => <li key={a} className="flex gap-3 rounded-md border border-warm/20 bg-warm/5 p-3 text-sm"><AlertTriangle aria-hidden="true" className="shrink-0 text-warm" size={16} />{a}</li>)}</ul></section></div>
    </div>
  );
}
