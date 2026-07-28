import { useEffect, useState } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail } from "lucide-react";
import { tApi } from "@/lib/api";
import {
    formatBRL,
    formatBRLCompact,
    formatDateTime,
    formatPhoneBR,
    formatRelative,
    initials,
} from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const APPT_LABEL = {
    scheduled: ["Agendado", "text-ink"],
    confirmed: ["Confirmado", "text-primary"],
    attended: ["Compareceu", "text-primary"],
    no_show: ["No-show", "text-danger"],
    cancelled: ["Cancelado", "text-ink-dim"],
    arrived: ["Chegou", "text-info"],
};

export default function PacienteDetalhe() {
    const { slug } = useOutletContext();
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (slug && id) tApi(slug).getPatient(id).then(setData);
    }, [slug, id]);

    if (!data) return <div className="p-8 eyebrow">Carregando…</div>;
    const { patient: p, appointments, treatment_plans } = data;

    return (
        <div className="p-8 max-w-[1200px] mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="mb-6 text-sm text-ink-muted hover:text-ink inline-flex items-center gap-2"
            >
                <ArrowLeft size={14} /> Voltar
            </button>

            <div className="flex items-start gap-6 mb-8">
                <div className="h-20 w-20 rounded-full bg-bg-elev border border-line flex items-center justify-center font-display text-2xl">
                    {initials(p.full_name)}
                </div>
                <div className="flex-1">
                    <div className="eyebrow">Paciente</div>
                    <h1 className="font-display text-4xl mt-1 leading-tight">{p.full_name}</h1>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-muted">
                        <span className="inline-flex items-center gap-2 font-mono">
                            <Phone size={12} /> {formatPhoneBR(p.phone) || "—"}
                        </span>
                        {p.email && (
                            <span className="inline-flex items-center gap-2 font-mono">
                                <Mail size={12} /> {p.email}
                            </span>
                        )}
                        {p.first_source && (
                            <span className="font-mono text-xs">Origem: <span className="text-ink">{p.first_source}</span></span>
                        )}
                    </div>
                    <div className="mt-3 flex gap-2">
                        {(p.tags || []).map((t) => (
                            <Badge key={t} variant="outline" className="border-line text-ink-muted text-[10px] font-mono uppercase">
                                {t}
                            </Badge>
                        ))}
                    </div>
                </div>
                <div className="text-right card-surface p-5 min-w-[180px]">
                    <div className="eyebrow">LTV realizado</div>
                    <div className="metric-num text-3xl mt-1">{formatBRLCompact(p.ltv_cents_realized)}</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="card-surface p-6">
                    <div className="eyebrow mb-4">Consultas ({appointments.length})</div>
                    <div className="space-y-3">
                        {appointments.map((a) => {
                            const [label, cls] = APPT_LABEL[a.status] || APPT_LABEL.scheduled;
                            return (
                                <div key={a.id} className="border-b border-line last:border-0 pb-3 last:pb-0">
                                    <div className="flex items-baseline justify-between">
                                        <div className="text-sm">{formatDateTime(a.start_at)}</div>
                                        <div className={`text-xs font-mono uppercase tracking-widest ${cls}`}>{label}</div>
                                    </div>
                                    {a.price_cents && (
                                        <div className="mt-1 text-xs text-ink-dim font-mono">
                                            {formatBRL(a.price_cents)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {!appointments.length && (
                            <div className="text-sm text-ink-dim">Sem consultas registradas</div>
                        )}
                    </div>
                </div>

                <div className="card-surface p-6">
                    <div className="eyebrow mb-4">Orçamentos ({treatment_plans.length})</div>
                    <div className="space-y-3">
                        {treatment_plans.map((pl) => (
                            <div key={pl.id} className="border-b border-line last:border-0 pb-3 last:pb-0">
                                <div className="flex items-baseline justify-between">
                                    <div className="text-sm">{pl.title}</div>
                                    <div className="metric-num text-lg">{formatBRL(pl.final_cents)}</div>
                                </div>
                                <div className="mt-1 text-xs text-ink-dim font-mono uppercase tracking-widest">
                                    {pl.status} · {formatRelative(pl.created_at)}
                                </div>
                            </div>
                        ))}
                        {!treatment_plans.length && (
                            <div className="text-sm text-ink-dim">Sem orçamentos</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
