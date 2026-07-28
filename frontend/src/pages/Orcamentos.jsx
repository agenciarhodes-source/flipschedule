import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Copy, Trash2, X } from "lucide-react";
import { tApi } from "@/lib/api";
import { formatBRL, formatBRLCompact, formatRelative } from "@/lib/format";
import { ORCAMENTOS } from "@/constants/testIds";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE = {
    draft: ["Rascunho", "bg-bg-elev text-ink-muted border-line"],
    sent: ["Enviado", "bg-info/10 text-info border-info/30"],
    viewed: ["Visualizado", "bg-warm/10 text-warm border-warm/30"],
    accepted: ["Aceito", "bg-primary/15 text-primary border-primary/40"],
    rejected: ["Rejeitado", "bg-danger/10 text-danger border-danger/30"],
    expired: ["Expirado", "bg-bg-elev text-ink-dim border-line"],
};

export default function Orcamentos() {
    const { slug } = useOutletContext();
    const [plans, setPlans] = useState([]);
    const [patients, setPatients] = useState([]);
    const [procs, setProcs] = useState([]);
    const [pros, setPros] = useState([]);
    const [modal, setModal] = useState(null);

    const load = async () => {
        const [pl, pt, pr, prof] = await Promise.all([
            tApi(slug).plans(),
            tApi(slug).patients(),
            tApi(slug).procedures(),
            tApi(slug).professionals(),
        ]);
        setPlans(pl);
        setPatients(pt);
        setProcs(pr);
        setPros(prof);
    };

    useEffect(() => {
        if (slug) load();
        // eslint-disable-next-line
    }, [slug]);

    const kpis = useMemo(() => {
        const decided = plans.filter((p) => ["accepted", "rejected"].includes(p.status));
        const accepted = plans.filter((p) => p.status === "accepted");
        const closeRate = decided.length ? Math.round((accepted.length / decided.length) * 100) : 0;
        const avgTicket = accepted.length
            ? Math.round(accepted.reduce((a, b) => a + (b.final_cents || 0), 0) / accepted.length)
            : 0;
        const inProgress = plans.filter((p) => ["sent", "viewed", "draft"].includes(p.status)).length;
        return { closeRate, avgTicket, inProgress, total: plans.length };
    }, [plans]);

    const newPlan = () => {
        setModal({
            mode: "create",
            patient_id: patients[0]?.id || "",
            professional_id: pros[0]?.id || "",
            title: "Plano de tratamento",
            items: [],
            discount_cents: 0,
        });
    };

    const addItem = () => {
        const proc = procs[0];
        if (!proc) return;
        setModal((m) => ({
            ...m,
            items: [
                ...m.items,
                {
                    id: crypto.randomUUID(),
                    procedure_id: proc.id,
                    description: proc.name,
                    tooth_number: "",
                    quantity: 1,
                    unit_price_cents: proc.default_price_cents || 0,
                },
            ],
        }));
    };

    const updateItem = (idx, patch) => {
        setModal((m) => {
            const items = [...m.items];
            items[idx] = { ...items[idx], ...patch };
            return { ...m, items };
        });
    };

    const removeItem = (idx) => {
        setModal((m) => ({ ...m, items: m.items.filter((_, i) => i !== idx) }));
    };

    const total = useMemo(() => {
        if (!modal) return 0;
        return modal.items.reduce((s, i) => s + (i.quantity || 1) * (i.unit_price_cents || 0), 0);
    }, [modal]);

    const save = async (send = false) => {
        try {
            const body = {
                patient_id: modal.patient_id,
                professional_id: modal.professional_id,
                title: modal.title,
                items: modal.items,
                discount_cents: Number(modal.discount_cents || 0),
                payment_options: { cash_discount_pct: 10, installments: [3, 6, 10, 12] },
            };
            const plan = await tApi(slug).createPlan(body);
            if (send) {
                const updated = await tApi(slug).updatePlan(plan.id, { status: "sent" });
                const url = `${window.location.origin}/plano/${updated.public_token}`;
                await navigator.clipboard.writeText(url).catch(() => {});
                toast.success("Link copiado — envie via WhatsApp");
            } else {
                toast.success("Orçamento salvo como rascunho");
            }
            setModal(null);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Erro ao salvar");
        }
    };

    const copyLink = async (plan) => {
        let p = plan;
        if (!p.public_token || p.status === "draft") {
            p = await tApi(slug).updatePlan(p.id, { status: "sent" });
        }
        const url = `${window.location.origin}/plano/${p.public_token}`;
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado", { description: url });
        load();
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto">
            <div className="mb-8 flex items-end justify-between animate-slide-up">
                <div>
                    <div className="eyebrow">Orçamentos · planos de tratamento</div>
                    <h1 className="font-display text-4xl mt-2 leading-tight">
                        Da proposta ao <em className="text-primary not-italic">aceite</em>.
                    </h1>
                </div>
                <button
                    onClick={newPlan}
                    data-testid={ORCAMENTOS.newPlan}
                    className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2"
                >
                    <Plus size={14} /> Novo orçamento
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <div className="card-surface p-5">
                    <div className="eyebrow mb-2">Fechamento</div>
                    <div className="metric-num text-3xl">{kpis.closeRate}%</div>
                </div>
                <div className="card-surface p-5">
                    <div className="eyebrow mb-2">Ticket médio aceito</div>
                    <div className="metric-num text-3xl">{formatBRLCompact(kpis.avgTicket)}</div>
                </div>
                <div className="card-surface p-5">
                    <div className="eyebrow mb-2">Em andamento</div>
                    <div className="metric-num text-3xl">{kpis.inProgress}</div>
                </div>
                <div className="card-surface p-5">
                    <div className="eyebrow mb-2">Total emitidos</div>
                    <div className="metric-num text-3xl">{kpis.total}</div>
                </div>
            </div>

            {/* Table */}
            <div className="card-surface overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="border-b border-line bg-bg-elev/40">
                        <tr className="text-left">
                            <th className="px-5 py-3 eyebrow">Paciente</th>
                            <th className="px-5 py-3 eyebrow">Título</th>
                            <th className="px-5 py-3 eyebrow text-right">Valor</th>
                            <th className="px-5 py-3 eyebrow">Status</th>
                            <th className="px-5 py-3 eyebrow">Enviado</th>
                            <th className="px-5 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {plans.map((p) => {
                            const [label, cls] = STATUS_BADGE[p.status] || STATUS_BADGE.draft;
                            return (
                                <tr
                                    key={p.id}
                                    data-testid={ORCAMENTOS.row}
                                    className="border-b border-line last:border-0 hover:bg-bg-hover/50"
                                >
                                    <td className="px-5 py-4">{p.patient?.full_name || "—"}</td>
                                    <td className="px-5 py-4 text-ink-muted">{p.title}</td>
                                    <td className="px-5 py-4 text-right metric-num">{formatBRL(p.final_cents)}</td>
                                    <td className="px-5 py-4">
                                        <Badge variant="outline" className={`font-mono uppercase tracking-widest text-[9px] ${cls}`}>
                                            {label}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-4 text-ink-muted font-mono text-xs">
                                        {formatRelative(p.sent_at || p.created_at)}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button
                                            onClick={() => copyLink(p)}
                                            data-testid={ORCAMENTOS.copyLink}
                                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                        >
                                            <Copy size={11} /> Copiar link
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {!plans.length && (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-ink-dim">
                                    Nenhum orçamento ainda. Crie o primeiro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal create */}
            <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
                <DialogContent className="max-w-2xl bg-bg-elev border-line max-h-[90vh] overflow-y-auto scrollbar-thin">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl">Novo orçamento</DialogTitle>
                    </DialogHeader>
                    {modal && (
                        <div className="space-y-4 py-2">
                            <div>
                                <Label className="eyebrow">Título</Label>
                                <Input
                                    value={modal.title}
                                    onChange={(e) => setModal({ ...modal, title: e.target.value })}
                                    className="bg-bg-alt border-line"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="eyebrow">Paciente</Label>
                                    <Select value={modal.patient_id} onValueChange={(v) => setModal({ ...modal, patient_id: v })}>
                                        <SelectTrigger className="bg-bg-alt border-line">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {patients.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="eyebrow">Profissional</Label>
                                    <Select value={modal.professional_id} onValueChange={(v) => setModal({ ...modal, professional_id: v })}>
                                        <SelectTrigger className="bg-bg-alt border-line">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pros.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="eyebrow">Itens</Label>
                                    <button
                                        onClick={addItem}
                                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Adicionar item
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {modal.items.map((it, idx) => (
                                        <div key={it.id} className="grid grid-cols-[1fr_80px_100px_120px_28px] gap-2 items-center">
                                            <Select
                                                value={it.procedure_id}
                                                onValueChange={(v) => {
                                                    const proc = procs.find((p) => p.id === v);
                                                    updateItem(idx, {
                                                        procedure_id: v,
                                                        description: proc?.name || "",
                                                        unit_price_cents: proc?.default_price_cents || 0,
                                                    });
                                                }}
                                            >
                                                <SelectTrigger className="bg-bg-alt border-line text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {procs.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                placeholder="Dente"
                                                value={it.tooth_number || ""}
                                                onChange={(e) => updateItem(idx, { tooth_number: e.target.value })}
                                                className="bg-bg-alt border-line text-xs"
                                            />
                                            <Input
                                                type="number"
                                                min={1}
                                                value={it.quantity}
                                                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                                                className="bg-bg-alt border-line text-xs"
                                            />
                                            <Input
                                                type="number"
                                                min={0}
                                                value={(it.unit_price_cents || 0) / 100}
                                                onChange={(e) => updateItem(idx, { unit_price_cents: Math.round(Number(e.target.value) * 100) })}
                                                className="bg-bg-alt border-line text-xs font-mono"
                                            />
                                            <button onClick={() => removeItem(idx)} className="text-ink-dim hover:text-danger">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {!modal.items.length && (
                                        <div className="text-xs text-ink-dim italic px-2 py-3 border border-dashed border-line rounded">
                                            Adicione ao menos 1 item
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-line pt-4 flex items-center justify-between gap-6">
                                <div className="flex-1">
                                    <Label className="eyebrow">Desconto (R$)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={(modal.discount_cents || 0) / 100}
                                        onChange={(e) => setModal({ ...modal, discount_cents: Math.round(Number(e.target.value) * 100) })}
                                        className="bg-bg-alt border-line font-mono"
                                    />
                                </div>
                                <div className="text-right">
                                    <div className="eyebrow mb-1">Total</div>
                                    <div className="metric-num text-3xl">{formatBRL(Math.max(0, total - (modal.discount_cents || 0)))}</div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModal(null)} className="border-line">
                            Cancelar
                        </Button>
                        <Button variant="outline" onClick={() => save(false)} className="border-line">
                            Salvar rascunho
                        </Button>
                        <Button onClick={() => save(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            Enviar & copiar link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
