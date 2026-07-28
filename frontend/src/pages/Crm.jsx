import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { tApi } from "@/lib/api";
import { CRM } from "@/constants/testIds";
import { formatBRLCompact, formatRelative, initials } from "@/lib/format";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const COLUMNS = [
    { key: "new", label: "Novo", color: "border-info" },
    { key: "qualifying", label: "Qualificando", color: "border-warm" },
    { key: "qualified", label: "Qualificado", color: "border-primary" },
    { key: "scheduled", label: "Agendado", color: "border-primary" },
    { key: "won", label: "Fechado", color: "border-primary" },
    { key: "lost", label: "Perdido", color: "border-danger" },
];

const CHANNEL_STYLE = {
    whatsapp: "bg-primary/10 text-primary border-primary/30",
    instagram: "bg-warm/10 text-warm border-warm/30",
    facebook_messenger: "bg-info/10 text-info border-info/30",
    form: "bg-bg-elev text-ink-muted border-line",
};

export default function Crm() {
    const { slug } = useOutletContext();
    const [leads, setLeads] = useState([]);
    const [procs, setProcs] = useState([]);
    const [dragging, setDragging] = useState(null);

    const load = async () => {
        const [l, p] = await Promise.all([tApi(slug).leads(), tApi(slug).procedures()]);
        setLeads(l);
        setProcs(p);
    };

    useEffect(() => {
        if (slug) load();
        // eslint-disable-next-line
    }, [slug]);

    const procMap = useMemo(() => Object.fromEntries(procs.map((p) => [p.id, p])), [procs]);

    const byStage = useMemo(() => {
        const out = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
        for (const l of leads) {
            const stage = out[l.stage] ? l.stage : "new";
            out[stage].push(l);
        }
        return out;
    }, [leads]);

    const onDrop = async (stage) => {
        if (!dragging) return;
        if (dragging.stage === stage) {
            setDragging(null);
            return;
        }
        try {
            await tApi(slug).updateLead(dragging.id, { stage });
            toast.success(`Lead movido para ${COLUMNS.find((c) => c.key === stage)?.label}`);
            load();
        } catch (e) {
            toast.error("Erro ao mover lead");
        }
        setDragging(null);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="mb-8 animate-slide-up">
                <div className="eyebrow">Pipeline de vendas</div>
                <h1 className="font-display text-4xl mt-2 leading-tight">
                    <em className="text-primary not-italic">CRM</em> · Kanban
                </h1>
                <p className="mt-3 text-ink-muted">
                    Do primeiro contato ao paciente que fecha. Arraste os cards entre colunas.
                </p>
            </div>

            <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4">
                {COLUMNS.map((col) => (
                    <div
                        key={col.key}
                        data-testid={CRM.column}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDrop(col.key)}
                        className={`w-72 shrink-0 card-surface p-3 border-t-2 ${col.color}`}
                    >
                        <div className="flex items-baseline justify-between mb-3 px-1">
                            <div className="eyebrow">{col.label}</div>
                            <div className="font-mono text-xs text-ink-muted">
                                {byStage[col.key].length}
                            </div>
                        </div>
                        <div className="space-y-2 min-h-[40px]">
                            {byStage[col.key].map((l) => {
                                const proc = procMap[l.procedure_id];
                                return (
                                    <div
                                        key={l.id}
                                        draggable
                                        onDragStart={() => setDragging(l)}
                                        onDragEnd={() => setDragging(null)}
                                        data-testid={CRM.card}
                                        className="bg-bg-elev border border-line rounded-md p-3 hover:border-line-strong cursor-grab active:cursor-grabbing"
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="h-8 w-8 rounded-full bg-bg-hover flex items-center justify-center text-[10px] font-mono text-ink-muted">
                                                {initials(l.patient?.full_name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm truncate">{l.patient?.full_name || "—"}</div>
                                                <div className="font-mono text-[10px] text-ink-dim mt-0.5">
                                                    {formatRelative(l.created_at)}
                                                </div>
                                            </div>
                                        </div>

                                        {proc && (
                                            <div className="mt-3 text-xs text-ink-muted">
                                                {proc.name}
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="metric-num text-lg">
                                                {formatBRLCompact(l.estimated_value_cents)}
                                            </div>
                                            {l.first_channel && (
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[9px] font-mono uppercase tracking-widest border ${
                                                        CHANNEL_STYLE[l.first_channel] || CHANNEL_STYLE.form
                                                    }`}
                                                >
                                                    {l.first_channel.replace("_", " ")}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
