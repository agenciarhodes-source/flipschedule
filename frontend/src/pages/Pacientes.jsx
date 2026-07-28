import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { tApi } from "@/lib/api";
import { formatBRLCompact, formatPhoneBR, formatRelative, toE164BR, initials } from "@/lib/format";
import { PACIENTES } from "@/constants/testIds";
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
import { Badge } from "@/components/ui/badge";

export default function Pacientes() {
    const { slug } = useOutletContext();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [q, setQ] = useState("");
    const [modal, setModal] = useState(null);

    const load = async () => {
        const res = await tApi(slug).patients(q);
        setItems(res);
    };

    useEffect(() => {
        if (slug) load();
        // eslint-disable-next-line
    }, [slug, q]);

    const save = async () => {
        if (!modal.full_name || !modal.phone) {
            toast.error("Nome e telefone são obrigatórios");
            return;
        }
        try {
            await tApi(slug).createPatient({
                full_name: modal.full_name,
                phone: toE164BR(modal.phone),
                email: modal.email,
                lgpd_consent: true,
            });
            toast.success("Paciente cadastrado");
            setModal(null);
            load();
        } catch (e) {
            toast.error("Erro ao cadastrar");
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto">
            <div className="mb-8 flex items-end justify-between animate-slide-up">
                <div>
                    <div className="eyebrow">Base de pacientes</div>
                    <h1 className="font-display text-4xl mt-2 leading-tight">
                        <em className="text-primary not-italic">Pacientes</em>
                    </h1>
                </div>
                <button
                    onClick={() => setModal({ full_name: "", phone: "", email: "" })}
                    data-testid={PACIENTES.newBtn}
                    className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2"
                >
                    <Plus size={14} /> Novo paciente
                </button>
            </div>

            <div className="mb-4 flex items-center gap-2 max-w-md px-3 py-2 border border-line rounded-md bg-bg-elev">
                <Search size={14} className="text-ink-dim" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    data-testid={PACIENTES.search}
                    placeholder="Buscar por nome ou telefone…"
                    className="bg-transparent outline-none flex-1 text-sm placeholder:text-ink-dim"
                />
            </div>

            <div className="card-surface overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="border-b border-line bg-bg-elev/40">
                        <tr className="text-left">
                            <th className="px-5 py-3 eyebrow">Paciente</th>
                            <th className="px-5 py-3 eyebrow">Telefone</th>
                            <th className="px-5 py-3 eyebrow">Origem</th>
                            <th className="px-5 py-3 eyebrow text-right">LTV</th>
                            <th className="px-5 py-3 eyebrow">Cadastro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((p) => (
                            <tr
                                key={p.id}
                                onClick={() => navigate(`/${slug}/pacientes/${p.id}`)}
                                data-testid={PACIENTES.row}
                                className="border-b border-line last:border-0 hover:bg-bg-hover/60 cursor-pointer"
                            >
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-bg-elev flex items-center justify-center text-[10px] font-mono">
                                            {initials(p.full_name)}
                                        </div>
                                        <div>
                                            <div>{p.full_name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {p.tags?.slice(0, 2).map((t) => (
                                                    <Badge
                                                        key={t}
                                                        variant="outline"
                                                        className="text-[9px] font-mono uppercase border-line text-ink-dim"
                                                    >
                                                        {t}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                                    {formatPhoneBR(p.phone)}
                                </td>
                                <td className="px-5 py-3 text-ink-muted">{p.first_source || "—"}</td>
                                <td className="px-5 py-3 text-right metric-num">{formatBRLCompact(p.ltv_cents_realized)}</td>
                                <td className="px-5 py-3 text-ink-muted font-mono text-xs">
                                    {formatRelative(p.created_at)}
                                </td>
                            </tr>
                        ))}
                        {!items.length && (
                            <tr>
                                <td colSpan={5} className="p-10 text-center text-ink-dim">
                                    Nenhum paciente encontrado
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
                <DialogContent className="bg-bg-elev border-line max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl">Novo paciente</DialogTitle>
                    </DialogHeader>
                    {modal && (
                        <div className="space-y-3 py-2">
                            <div>
                                <Label className="eyebrow">Nome completo</Label>
                                <Input
                                    value={modal.full_name}
                                    onChange={(e) => setModal({ ...modal, full_name: e.target.value })}
                                    className="bg-bg-alt border-line"
                                />
                            </div>
                            <div>
                                <Label className="eyebrow">Telefone</Label>
                                <Input
                                    value={modal.phone}
                                    onChange={(e) => setModal({ ...modal, phone: e.target.value })}
                                    placeholder="(86) 98765-4321"
                                    className="bg-bg-alt border-line font-mono"
                                />
                            </div>
                            <div>
                                <Label className="eyebrow">E-mail (opcional)</Label>
                                <Input
                                    value={modal.email}
                                    onChange={(e) => setModal({ ...modal, email: e.target.value })}
                                    className="bg-bg-alt border-line"
                                />
                            </div>
                            <div className="text-xs text-ink-dim leading-relaxed pt-2">
                                ⚑ Ao salvar, registramos consentimento LGPD para contato.
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModal(null)} className="border-line">
                            Cancelar
                        </Button>
                        <Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            Cadastrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
