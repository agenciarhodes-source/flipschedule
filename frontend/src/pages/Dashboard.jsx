import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";
import { tApi } from "@/lib/api";
import { formatBRL, formatBRLCompact } from "@/lib/format";

function KpiCard({ eyebrow, value, delta, positive, sub, big }) {
    const cls = positive === true ? "text-primary" : positive === false ? "text-danger" : "text-warm";
    return (
        <div className={`card-surface p-5 ${big ? "md:col-span-2 md:row-span-2" : ""}`}>
            <div className="eyebrow mb-3">{eyebrow}</div>
            <div className={`metric-num ${big ? "text-6xl" : "text-4xl"} leading-none`}>{value}</div>
            {delta && (
                <div className={`mt-3 flex items-center gap-1.5 text-xs font-mono ${cls}`}>
                    {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    Δ {delta}
                </div>
            )}
            {sub && <div className="mt-2 text-xs text-ink-dim">{sub}</div>}
        </div>
    );
}

export default function Dashboard() {
    const { slug, tenant } = useOutletContext();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!slug) return;
        tApi(slug).dashboard().then(setData);
    }, [slug]);

    if (!data) {
        return (
            <div className="p-8">
                <div className="eyebrow">Carregando…</div>
            </div>
        );
    }

    const k = data.kpis;
    const now = new Date();
    const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    return (
        <div className="p-8 max-w-[1400px] mx-auto">
            <div className="mb-8 animate-slide-up">
                <div className="eyebrow">{monthLabel.toUpperCase()}</div>
                <h1 className="font-display text-5xl mt-2 leading-tight">
                    Boa tarde, <em className="text-primary not-italic">Dra. Renata.</em>
                </h1>
                <p className="mt-3 text-ink-muted max-w-2xl">
                    Últimos 30 dias em números — seu faturamento em cadeira, com ROI por origem.
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 auto-rows-fr">
                <KpiCard
                    big
                    eyebrow="Receita realizada · mês"
                    value={formatBRLCompact(k.revenue_month_cents)}
                    delta={`${k.revenue_delta_pct}%`}
                    positive={k.revenue_delta_pct >= 0}
                    sub={`Mês anterior: ${formatBRL(k.revenue_prev_month_cents)}`}
                />
                <KpiCard eyebrow="Comparecimento" value={`${k.attendance_rate}%`} delta="+8pp" positive />
                <KpiCard eyebrow="Fechamento orçamento" value={`${k.close_rate}%`} delta="+15pp" positive />
                <KpiCard eyebrow="Ticket médio aceito" value={formatBRLCompact(k.ticket_avg_cents)} delta="+12%" positive />
                <KpiCard eyebrow="Tempo de resposta" value={`${Math.floor(k.response_time_seconds / 60)}m${k.response_time_seconds % 60}s`} delta="-72%" positive />
                <KpiCard eyebrow="CAC" value={formatBRLCompact(k.cac_cents)} delta="-38%" positive />
                <KpiCard eyebrow="Ocupação de agenda" value={`${k.occupancy_rate}%`} delta="+6pp" positive />
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="md:col-span-2 card-surface p-6">
                    <div className="flex items-baseline justify-between mb-4">
                        <div>
                            <div className="eyebrow">Receita · últimos 6 meses</div>
                            <div className="font-display text-2xl mt-1">Faturamento em cadeira</div>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.revenue_series}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="hsl(129 61% 74%)" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="hsl(129 61% 74%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="hsl(210 20% 21%)" strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    stroke="hsl(207 5% 46%)"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    fontFamily="IBM Plex Mono"
                                />
                                <YAxis
                                    stroke="hsl(207 5% 46%)"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `R$ ${(v / 100000).toFixed(0)}k`}
                                    fontFamily="IBM Plex Mono"
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(207 24% 15%)",
                                        border: "1px solid hsl(210 20% 21%)",
                                        borderRadius: 6,
                                        color: "hsl(38 39% 91%)",
                                    }}
                                    formatter={(v) => [formatBRL(v), "Receita"]}
                                    labelStyle={{ color: "hsl(207 4% 68%)" }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value_cents"
                                    stroke="hsl(129 61% 74%)"
                                    strokeWidth={2}
                                    fill="url(#revGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card-surface p-6">
                    <div className="eyebrow mb-2">Top procedimentos · mês</div>
                    <div className="font-display text-2xl mb-4">Receita por procedimento</div>
                    <div className="space-y-3">
                        {(data.top_procedures.length ? data.top_procedures : [
                            { name: "Ainda sem dados", value_cents: 0 },
                        ]).map((p, i) => {
                            const max = Math.max(...data.top_procedures.map((x) => x.value_cents), 1);
                            const pct = (p.value_cents / max) * 100;
                            return (
                                <div key={i}>
                                    <div className="flex items-baseline justify-between mb-1">
                                        <div className="text-sm truncate">{p.name}</div>
                                        <div className="font-mono text-xs text-ink-muted">{formatBRLCompact(p.value_cents)}</div>
                                    </div>
                                    <div className="h-1 bg-bg-elev rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Funnel + Alerts */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 card-surface p-6">
                    <div className="eyebrow mb-2">Funil de conversão</div>
                    <div className="font-display text-2xl mb-6">Lead → Paciente que fecha</div>
                    <div className="grid grid-cols-5 gap-3">
                        {[
                            ["Leads", data.funnel.leads],
                            ["Qualificados", data.funnel.qualified],
                            ["Agendados", data.funnel.scheduled],
                            ["Compareceram", data.funnel.attended],
                            ["Fecharam", data.funnel.won],
                        ].map(([label, v], i) => {
                            const first = data.funnel.leads || 1;
                            const pct = Math.round((v / first) * 100);
                            return (
                                <div key={i} className="border-l-2 border-line pl-3">
                                    <div className="eyebrow">{label}</div>
                                    <div className="metric-num text-3xl mt-1">{v}</div>
                                    <div className="mt-1 font-mono text-[10px] text-ink-dim">{pct}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card-surface p-6">
                    <div className="eyebrow mb-4">Alertas · esta semana</div>
                    <div className="space-y-3">
                        {data.alerts.map((a, i) => {
                            const border =
                                a.type === "danger"
                                    ? "border-l-danger"
                                    : a.type === "warn"
                                    ? "border-l-warm"
                                    : "border-l-info";
                            const Icon = a.type === "info" ? Info : AlertTriangle;
                            const iconColor =
                                a.type === "danger" ? "text-danger" : a.type === "warn" ? "text-warm" : "text-info";
                            return (
                                <div
                                    key={i}
                                    className={`border-l-2 ${border} pl-3 py-1 flex items-start gap-2 text-sm`}
                                >
                                    <Icon size={14} className={`mt-0.5 shrink-0 ${iconColor}`} />
                                    <span className="text-ink-muted leading-relaxed">{a.message}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
