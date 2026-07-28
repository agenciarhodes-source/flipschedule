import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { tApi } from "@/lib/api";
import { formatBRLCompact } from "@/lib/format";
import { CONFIG } from "@/constants/testIds";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const COLORS = ["#95E4A5", "#7AB8E4", "#E4B47A", "#E67C6E", "#C7A6F2", "#F09EC7"];

export default function Configuracoes() {
    const { slug } = useOutletContext();
    const [pros, setPros] = useState([]);
    const [procs, setProcs] = useState([]);
    const [ress, setRess] = useState([]);
    const [modal, setModal] = useState(null);

    const load = async () => {
        const [p, pr, r] = await Promise.all([
            tApi(slug).professionals(),
            tApi(slug).procedures(),
            tApi(slug).resources(),
        ]);
        setPros(p);
        setProcs(pr);
        setRess(r);
    };

    useEffect(() => {
        if (slug) load();
        // eslint-disable-next-line
    }, [slug]);

    const saveProf = async () => {
        try {
            await tApi(slug).createProfessional({
                full_name: modal.full_name,
                cro: modal.cro,
                specialties: modal.specialties.split(",").map((s) => s.trim()).filter(Boolean),
                color: modal.color,
                active: true,
                working_hours: [1, 2, 3, 4, 5].map((w) => ({ weekday: w, start: "08:00", end: "18:00" })),
            });
            toast.success("Profissional adicionado");
            setModal(null);
            load();
        } catch {
            toast.error("Erro ao salvar");
        }
    };

    const saveProc = async () => {
        try {
            await tApi(slug).createProcedure({
                code: modal.code,
                name: modal.name,
                duration_minutes: Number(modal.duration_minutes),
                default_price_cents: Math.round(Number(modal.price) * 100),
                category: modal.category,
                active: true,
            });
            toast.success("Procedimento adicionado");
            setModal(null);
            load();
        } catch {
            toast.error("Erro ao salvar");
        }
    };

    const saveRes = async () => {
        try {
            await tApi(slug).createResource({
                name: modal.name,
                type: modal.type,
                active: true,
            });
            toast.success("Recurso adicionado");
            setModal(null);
            load();
        } catch {
            toast.error("Erro ao salvar");
        }
    };

    const del = async (kind, id) => {
        try {
            if (kind === "prof") await tApi(slug).deleteProfessional(id);
            if (kind === "proc") await tApi(slug).deleteProcedure(id);
            if (kind === "res") await tApi(slug).deleteResource(id);
            toast.success("Removido");
            load();
        } catch {
            toast.error("Erro ao remover");
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto">
            <div className="mb-8 animate-slide-up">
                <div className="eyebrow">Ajustes da clínica</div>
                <h1 className="font-display text-4xl mt-2">
                    <em className="text-primary not-italic">Configurações</em>
                </h1>
            </div>

            <Tabs defaultValue="profissionais" className="w-full">
                <TabsList className="bg-bg-elev border border-line">
                    <TabsTrigger value="profissionais" data-testid={CONFIG.tabProfissionais}>Profissionais</TabsTrigger>
                    <TabsTrigger value="procedimentos" data-testid={CONFIG.tabProcedimentos}>Procedimentos</TabsTrigger>
                    <TabsTrigger value="cadeiras" data-testid={CONFIG.tabCadeiras}>Cadeiras & salas</TabsTrigger>
                    <TabsTrigger value="regua">Réguas</TabsTrigger>
                </TabsList>

                {/* Profissionais */}
                <TabsContent value="profissionais" className="mt-6">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setModal({ kind: "prof", full_name: "", cro: "", specialties: "", color: COLORS[0] })}
                            data-testid={CONFIG.newProf}
                            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2"
                        >
                            <Plus size={14} /> Novo profissional
                        </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                        {pros.map((p) => (
                            <div key={p.id} className="card-surface p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full border-2" style={{ borderColor: p.color, background: p.color + "22" }} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm">{p.full_name}</div>
                                    <div className="font-mono text-xs text-ink-dim">
                                        {p.cro || "—"} · {p.specialties.join(", ") || "sem especialidade"}
                                    </div>
                                </div>
                                <button onClick={() => del("prof", p.id)} className="text-ink-dim hover:text-danger">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* Procedimentos */}
                <TabsContent value="procedimentos" className="mt-6">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setModal({ kind: "proc", code: "", name: "", duration_minutes: 30, price: 100, category: "Geral" })}
                            data-testid={CONFIG.newProc}
                            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2"
                        >
                            <Plus size={14} /> Novo procedimento
                        </button>
                    </div>
                    <div className="card-surface overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="border-b border-line bg-bg-elev/40">
                                <tr className="text-left">
                                    <th className="px-4 py-2 eyebrow">Código</th>
                                    <th className="px-4 py-2 eyebrow">Nome</th>
                                    <th className="px-4 py-2 eyebrow">Categoria</th>
                                    <th className="px-4 py-2 eyebrow text-right">Duração</th>
                                    <th className="px-4 py-2 eyebrow text-right">Preço</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {procs.map((p) => (
                                    <tr key={p.id} className="border-b border-line last:border-0">
                                        <td className="px-4 py-2 font-mono text-xs">{p.code || "—"}</td>
                                        <td className="px-4 py-2">{p.name}</td>
                                        <td className="px-4 py-2 text-ink-muted">{p.category || "—"}</td>
                                        <td className="px-4 py-2 text-right font-mono text-xs">{p.duration_minutes} min</td>
                                        <td className="px-4 py-2 text-right metric-num">{formatBRLCompact(p.default_price_cents)}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button onClick={() => del("proc", p.id)} className="text-ink-dim hover:text-danger">
                                                <Trash2 size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* Cadeiras */}
                <TabsContent value="cadeiras" className="mt-6">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setModal({ kind: "res", name: "", type: "chair" })}
                            data-testid={CONFIG.newRes}
                            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2"
                        >
                            <Plus size={14} /> Nova cadeira/sala
                        </button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                        {ress.map((r) => (
                            <div key={r.id} className="card-surface p-4 flex items-center justify-between">
                                <div>
                                    <div className="text-sm">{r.name}</div>
                                    <div className="font-mono text-[10px] text-ink-dim uppercase tracking-widest mt-1">{r.type}</div>
                                </div>
                                <button onClick={() => del("res", r.id)} className="text-ink-dim hover:text-danger">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* Régua */}
                <TabsContent value="regua" className="mt-6">
                    <div className="card-surface p-6">
                        <div className="eyebrow mb-2">Régua de comunicação</div>
                        <div className="font-display text-2xl mb-4">Automação de mensagens</div>
                        <div className="space-y-3">
                            {[
                                ["Confirmação 48h antes", true],
                                ["Lembrete 24h antes", true],
                                ["Lembrete 3h antes", true],
                                ["Follow-up plano D+1", true],
                                ["Follow-up plano D+3", true],
                                ["Follow-up plano D+7", false],
                                ["Reativação 180 dias", false],
                                ["Aniversário do paciente", true],
                            ].map(([label, active], i) => (
                                <div key={i} className="flex items-center justify-between border-b border-line pb-3 last:border-0">
                                    <div>
                                        <div className="text-sm">{label}</div>
                                        <div className="text-xs text-ink-dim font-mono mt-0.5">
                                            {active ? "ATIVA" : "PAUSADA"}
                                        </div>
                                    </div>
                                    <div className={`h-6 w-11 rounded-full p-0.5 transition ${active ? "bg-primary" : "bg-bg-elev border border-line"}`}>
                                        <div className={`h-5 w-5 rounded-full bg-bg transition ${active ? "translate-x-5" : ""}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-xs text-ink-dim italic">
                            ⚑ Envio real via WhatsApp Cloud API — a integrar na próxima fase.
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
                <DialogContent className="bg-bg-elev border-line max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl">
                            {modal?.kind === "prof" && "Novo profissional"}
                            {modal?.kind === "proc" && "Novo procedimento"}
                            {modal?.kind === "res" && "Nova cadeira / sala"}
                        </DialogTitle>
                    </DialogHeader>
                    {modal?.kind === "prof" && (
                        <div className="space-y-3">
                            <div>
                                <Label className="eyebrow">Nome</Label>
                                <Input value={modal.full_name} onChange={(e) => setModal({ ...modal, full_name: e.target.value })} className="bg-bg-alt border-line" />
                            </div>
                            <div>
                                <Label className="eyebrow">CRO</Label>
                                <Input value={modal.cro} onChange={(e) => setModal({ ...modal, cro: e.target.value })} className="bg-bg-alt border-line font-mono" />
                            </div>
                            <div>
                                <Label className="eyebrow">Especialidades (separar por vírgula)</Label>
                                <Input value={modal.specialties} onChange={(e) => setModal({ ...modal, specialties: e.target.value })} className="bg-bg-alt border-line" />
                            </div>
                            <div>
                                <Label className="eyebrow">Cor na agenda</Label>
                                <div className="flex gap-2 mt-2">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setModal({ ...modal, color: c })}
                                            className={`h-8 w-8 rounded-full ${modal.color === c ? "ring-2 ring-ink" : ""}`}
                                            style={{ background: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {modal?.kind === "proc" && (
                        <div className="space-y-3">
                            <div>
                                <Label className="eyebrow">Código</Label>
                                <Input value={modal.code} onChange={(e) => setModal({ ...modal, code: e.target.value })} className="bg-bg-alt border-line font-mono" />
                            </div>
                            <div>
                                <Label className="eyebrow">Nome</Label>
                                <Input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} className="bg-bg-alt border-line" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="eyebrow">Duração (min)</Label>
                                    <Input type="number" value={modal.duration_minutes} onChange={(e) => setModal({ ...modal, duration_minutes: e.target.value })} className="bg-bg-alt border-line font-mono" />
                                </div>
                                <div>
                                    <Label className="eyebrow">Preço (R$)</Label>
                                    <Input type="number" value={modal.price} onChange={(e) => setModal({ ...modal, price: e.target.value })} className="bg-bg-alt border-line font-mono" />
                                </div>
                            </div>
                            <div>
                                <Label className="eyebrow">Categoria</Label>
                                <Input value={modal.category} onChange={(e) => setModal({ ...modal, category: e.target.value })} className="bg-bg-alt border-line" />
                            </div>
                        </div>
                    )}
                    {modal?.kind === "res" && (
                        <div className="space-y-3">
                            <div>
                                <Label className="eyebrow">Nome</Label>
                                <Input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} className="bg-bg-alt border-line" />
                            </div>
                            <div>
                                <Label className="eyebrow">Tipo</Label>
                                <Select value={modal.type} onValueChange={(v) => setModal({ ...modal, type: v })}>
                                    <SelectTrigger className="bg-bg-alt border-line">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="chair">Cadeira</SelectItem>
                                        <SelectItem value="room">Sala</SelectItem>
                                        <SelectItem value="equipment">Equipamento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModal(null)} className="border-line">Cancelar</Button>
                        <Button
                            onClick={() => {
                                if (modal.kind === "prof") saveProf();
                                if (modal.kind === "proc") saveProc();
                                if (modal.kind === "res") saveRes();
                            }}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
