import { useEffect, useMemo, useState, Fragment } from "react";
import { useOutletContext } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { tApi } from "@/lib/api";
import { formatDate, formatTime, formatBRLCompact } from "@/lib/format";
import { AGENDA } from "@/constants/testIds";
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

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 a 18
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfWeek(d) {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    dt.setDate(dt.getDate() - dt.getDay());
    return dt;
}
function addDays(d, n) {
    const dt = new Date(d);
    dt.setDate(dt.getDate() + n);
    return dt;
}

const STATUS_STYLE = {
    scheduled: "bg-bg-elev border-line text-ink",
    confirmed: "bg-primary/15 border-primary/40 text-primary",
    arrived: "bg-info/15 border-info/40 text-info",
    attended: "bg-primary/30 border-primary/50 text-primary",
    no_show: "bg-danger/10 border-danger/30 text-danger line-through",
    cancelled: "bg-bg-elev border-line text-ink-dim line-through opacity-60",
};

export default function Agenda() {
    const { slug } = useOutletContext();
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
    const [appts, setAppts] = useState([]);
    const [pros, setPros] = useState([]);
    const [procs, setProcs] = useState([]);
    const [patients, setPatients] = useState([]);
    const [filterPro, setFilterPro] = useState("all");
    const [modal, setModal] = useState(null);
    const [dragging, setDragging] = useState(null);

    const load = async () => {
        if (!slug) return;
        const end = addDays(weekStart, 7);
        const [a, p, pr, pt] = await Promise.all([
            tApi(slug).appointments(weekStart.toISOString(), end.toISOString()),
            tApi(slug).professionals(),
            tApi(slug).procedures(),
            tApi(slug).patients(),
        ]);
        setAppts(a);
        setPros(p);
        setProcs(pr);
        setPatients(pt);
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line
    }, [slug, weekStart]);

    const proMap = useMemo(() => Object.fromEntries(pros.map((p) => [p.id, p])), [pros]);
    const patMap = useMemo(() => Object.fromEntries(patients.map((p) => [p.id, p])), [patients]);
    const procMap = useMemo(() => Object.fromEntries(procs.map((p) => [p.id, p])), [procs]);

    const filteredAppts = filterPro === "all" ? appts : appts.filter((a) => a.professional_id === filterPro);

    const openNew = (dayIdx, hour) => {
        const start = addDays(weekStart, dayIdx);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        setModal({
            mode: "create",
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            professional_id: pros[0]?.id || "",
            patient_id: patients[0]?.id || "",
            procedure_id: procs[0]?.id || "",
            notes: "",
        });
    };

    const openEdit = (a) => {
        setModal({ mode: "edit", ...a });
    };

    const save = async () => {
        try {
            if (modal.mode === "create") {
                await tApi(slug).createAppointment({
                    patient_id: modal.patient_id,
                    professional_id: modal.professional_id,
                    procedure_id: modal.procedure_id || null,
                    start_at: modal.start_at,
                    end_at: modal.end_at,
                    notes: modal.notes,
                });
                toast.success("Agendamento criado");
            } else {
                await tApi(slug).updateAppointment(modal.id, {
                    patient_id: modal.patient_id,
                    professional_id: modal.professional_id,
                    procedure_id: modal.procedure_id || null,
                    start_at: modal.start_at,
                    end_at: modal.end_at,
                    status: modal.status,
                    notes: modal.notes,
                });
                toast.success("Agendamento atualizado");
            }
            setModal(null);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Erro ao salvar");
        }
    };

    const setStatus = async (a, status) => {
        try {
            await tApi(slug).updateAppointment(a.id, { status });
            toast.success("Status atualizado");
            setModal(null);
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Erro");
        }
    };

    const handleDrop = async (dayIdx, hour) => {
        if (!dragging) return;
        const start = addDays(weekStart, dayIdx);
        start.setHours(hour, 0, 0, 0);
        const durationMs = new Date(dragging.end_at).getTime() - new Date(dragging.start_at).getTime();
        const end = new Date(start.getTime() + durationMs);
        try {
            await tApi(slug).updateAppointment(dragging.id, {
                start_at: start.toISOString(),
                end_at: end.toISOString(),
            });
            toast.success("Agendamento movido");
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Conflito de horário");
        }
        setDragging(null);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="mb-6 flex items-end justify-between animate-slide-up">
                <div>
                    <div className="eyebrow">Semana</div>
                    <h1 className="font-display text-4xl mt-2 leading-tight">
                        <em className="text-primary not-italic">Agenda</em>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setWeekStart(addDays(weekStart, -7))}
                        data-testid={AGENDA.prevWeek}
                        className="p-2 rounded-md border border-line hover:bg-bg-hover"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="font-mono text-xs uppercase tracking-widest text-ink-muted px-3">
                        {formatDate(weekStart, "dd MMM")} — {formatDate(addDays(weekStart, 6), "dd MMM · yyyy")}
                    </div>
                    <button
                        onClick={() => setWeekStart(addDays(weekStart, 7))}
                        data-testid={AGENDA.nextWeek}
                        className="p-2 rounded-md border border-line hover:bg-bg-hover"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        onClick={() => setWeekStart(startOfWeek(new Date()))}
                        className="px-3 py-2 rounded-md border border-line hover:bg-bg-hover text-sm"
                    >
                        Hoje
                    </button>
                </div>
            </div>

            {/* Filtro profissional */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className="eyebrow mr-2">Profissionais</span>
                <button
                    onClick={() => setFilterPro("all")}
                    className={`px-3 py-1 rounded-full text-xs border ${
                        filterPro === "all" ? "bg-bg-elev border-line-strong text-ink" : "border-line text-ink-muted"
                    }`}
                >
                    Todos
                </button>
                {pros.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setFilterPro(p.id)}
                        className={`px-3 py-1 rounded-full text-xs border flex items-center gap-2 ${
                            filterPro === p.id ? "bg-bg-elev border-line-strong text-ink" : "border-line text-ink-muted"
                        }`}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                        {p.full_name}
                    </button>
                ))}
            </div>

            {/* Grade */}
            <div className="card-surface overflow-x-auto scrollbar-thin">
                <div className="min-w-[900px] grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
                    {/* header row */}
                    <div className="border-b border-r border-line" />
                    {Array.from({ length: 7 }, (_, i) => {
                        const d = addDays(weekStart, i);
                        const isToday = d.toDateString() === new Date().toDateString();
                        return (
                            <div
                                key={i}
                                className={`border-b border-line px-3 py-3 ${
                                    isToday ? "bg-primary/5" : ""
                                }`}
                            >
                                <div className="eyebrow">{WEEKDAYS[d.getDay()]}</div>
                                <div className={`mt-1 font-display text-xl ${isToday ? "text-primary" : ""}`}>
                                    {d.getDate()}
                                </div>
                            </div>
                        );
                    })}

                    {/* body */}
                    {HOURS.map((h) => (
                        <Fragment key={`row-${h}`}>
                            <div
                                className="border-b border-r border-line px-2 py-1 text-right font-mono text-[10px] text-ink-dim"
                            >
                                {String(h).padStart(2, "0")}:00
                            </div>
                            {Array.from({ length: 7 }, (_, dayIdx) => {
                                const slotStart = addDays(weekStart, dayIdx);
                                slotStart.setHours(h, 0, 0, 0);
                                const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                                const cellAppts = filteredAppts.filter((a) => {
                                    const s = new Date(a.start_at);
                                    return s >= slotStart && s < slotEnd;
                                });
                                return (
                                    <div
                                        key={`c-${h}-${dayIdx}`}
                                        onClick={() => cellAppts.length === 0 && openNew(dayIdx, h)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDrop(dayIdx, h)}
                                        className="border-b border-line min-h-[64px] p-1 hover:bg-bg-hover/40 cursor-pointer transition"
                                    >
                                        {cellAppts.map((a) => {
                                            const pro = proMap[a.professional_id];
                                            const pt = patMap[a.patient_id];
                                            const proc = procMap[a.procedure_id];
                                            return (
                                                <div
                                                    key={a.id}
                                                    draggable
                                                    onDragStart={() => setDragging(a)}
                                                    onDragEnd={() => setDragging(null)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEdit(a);
                                                    }}
                                                    data-testid={AGENDA.apptCard}
                                                    className={`rounded-md px-2 py-1.5 mb-1 border text-xs cursor-grab active:cursor-grabbing ${STATUS_STYLE[a.status]}`}
                                                    style={{
                                                        borderLeftWidth: 3,
                                                        borderLeftColor: pro?.color || "hsl(129 61% 74%)",
                                                    }}
                                                >
                                                    <div className="font-medium truncate">{pt?.full_name || "—"}</div>
                                                    <div className="font-mono text-[10px] opacity-80 truncate">
                                                        {formatTime(a.start_at)} · {proc?.name || "—"}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </Fragment>
                    ))}
                </div>
            </div>

            {/* Modal */}
            <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
                <DialogContent className="max-w-lg bg-bg-elev border-line">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl">
                            {modal?.mode === "create" ? "Novo agendamento" : "Editar agendamento"}
                        </DialogTitle>
                    </DialogHeader>

                    {modal && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="eyebrow">Início</Label>
                                    <Input
                                        type="datetime-local"
                                        value={modal.start_at.slice(0, 16)}
                                        onChange={(e) => setModal({ ...modal, start_at: new Date(e.target.value).toISOString() })}
                                        className="bg-bg-alt border-line"
                                    />
                                </div>
                                <div>
                                    <Label className="eyebrow">Fim</Label>
                                    <Input
                                        type="datetime-local"
                                        value={modal.end_at.slice(0, 16)}
                                        onChange={(e) => setModal({ ...modal, end_at: new Date(e.target.value).toISOString() })}
                                        className="bg-bg-alt border-line"
                                    />
                                </div>
                            </div>

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

                            <div>
                                <Label className="eyebrow">Procedimento</Label>
                                <Select value={modal.procedure_id || ""} onValueChange={(v) => setModal({ ...modal, procedure_id: v })}>
                                    <SelectTrigger className="bg-bg-alt border-line">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {procs.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} · {formatBRLCompact(p.default_price_cents)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {modal.mode === "edit" && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <span className="eyebrow w-full mb-1">Ações rápidas</span>
                                    {[
                                        ["confirmed", "Confirmar", "bg-primary/20 text-primary border-primary/40"],
                                        ["attended", "Compareceu", "bg-primary/30 text-primary border-primary/50"],
                                        ["no_show", "No-show", "bg-danger/15 text-danger border-danger/40"],
                                        ["cancelled", "Cancelar", "bg-bg-alt text-ink-muted border-line"],
                                    ].map(([st, lbl, cls]) => (
                                        <button
                                            key={st}
                                            onClick={() => setStatus(modal, st)}
                                            className={`px-3 py-1.5 rounded-md border text-xs ${cls}`}
                                        >
                                            {lbl}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setModal(null)}
                            data-testid={AGENDA.modalCancel}
                            className="border-line"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={save}
                            data-testid={AGENDA.modalSave}
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
