import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, X, Shield } from "lucide-react";
import { publicApi } from "@/lib/api";
import { formatBRL, validateCPF, toE164BR } from "@/lib/format";
import { PUBLIC_PLAN } from "@/constants/testIds";
import { toast } from "sonner";

export default function PublicPlan() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [form, setForm] = useState({ full_name: "", cpf: "", phone: "", lgpd_agreed: false });
    const [done, setDone] = useState(null);

    useEffect(() => {
        publicApi
            .getPlan(token)
            .then(setData)
            .catch(() => setError(true));
    }, [token]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg text-ink px-4">
                <div className="text-center">
                    <div className="eyebrow">Plano não encontrado</div>
                    <div className="font-display text-4xl mt-2">Link <em className="text-danger not-italic">inválido</em>.</div>
                    <p className="mt-4 text-ink-muted">Verifique com sua clínica para receber um novo link.</p>
                </div>
            </div>
        );
    }
    if (!data) return <div className="min-h-screen flex items-center justify-center bg-bg text-ink">Carregando…</div>;

    const { plan, tenant, patient, professional } = data;

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg text-ink px-4">
                <div className="max-w-md text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
                        <Check size={32} className="text-primary" />
                    </div>
                    <div className="mt-6 eyebrow">Aceite registrado</div>
                    <h1 className="font-display text-4xl mt-2 leading-tight">
                        <em className="text-primary not-italic">{done === "accepted" ? "Obrigado" : "Registro salvo"}</em>!
                    </h1>
                    <p className="mt-4 text-ink-muted leading-relaxed">
                        {done === "accepted"
                            ? `Sua clínica ${tenant.name} entrará em contato em breve para agendar o próximo passo.`
                            : "Recebemos sua resposta. Ainda pode reconsiderar mais tarde."}
                    </p>
                </div>
            </div>
        );
    }

    const submitAccept = async () => {
        if (!form.full_name.trim()) return toast.error("Informe seu nome completo");
        if (!validateCPF(form.cpf)) return toast.error("CPF inválido");
        if (!form.phone.replace(/\D/g, "")) return toast.error("Informe seu telefone");
        if (!form.lgpd_agreed) return toast.error("É necessário concordar com os termos LGPD");

        try {
            await publicApi.acceptPlan(token, {
                full_name: form.full_name,
                cpf: form.cpf.replace(/\D/g, ""),
                phone: toE164BR(form.phone),
                lgpd_agreed: true,
            });
            setDone("accepted");
        } catch (e) {
            toast.error(e.response?.data?.detail || "Erro ao registrar aceite");
        }
    };

    const reject = async () => {
        await publicApi.rejectPlan(token, "");
        setDone("rejected");
    };

    return (
        <div className="min-h-screen bg-bg text-ink">
            <div className="max-w-2xl mx-auto px-6 py-10">
                {/* Clínica header */}
                <div className="text-center mb-10">
                    <div className="eyebrow">{tenant.name}</div>
                    <h1 className="font-display text-3xl md:text-4xl mt-2 leading-tight">
                        Seu plano de tratamento está <em className="text-primary not-italic">pronto</em>.
                    </h1>
                    <p className="mt-3 text-sm text-ink-muted">
                        Olá {patient?.full_name?.split(" ")[0] || "paciente"}, revise abaixo os detalhes propostos.
                    </p>
                </div>

                <div className="card-surface p-6 md:p-8">
                    <div className="flex items-baseline justify-between border-b border-line pb-4 mb-4">
                        <div>
                            <div className="eyebrow">Plano</div>
                            <div className="font-display text-2xl mt-1">{plan.title}</div>
                            {professional && (
                                <div className="text-xs text-ink-muted mt-1">
                                    Responsável: {professional.full_name}
                                    {professional.cro && ` · ${professional.cro}`}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        {plan.items?.map((it, i) => (
                            <div key={i} className="flex items-start justify-between text-sm border-b border-line/50 pb-3 last:border-0">
                                <div>
                                    <div>{it.description}</div>
                                    <div className="font-mono text-xs text-ink-dim mt-1">
                                        {it.tooth_number ? `Dente ${it.tooth_number} · ` : ""}Qtd {it.quantity}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="metric-num text-lg">
                                        {formatBRL((it.unit_price_cents || 0) * (it.quantity || 1))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 space-y-2 border-t border-line pt-4">
                        <div className="flex justify-between text-sm text-ink-muted">
                            <span>Subtotal</span>
                            <span className="font-mono">{formatBRL(plan.total_cents)}</span>
                        </div>
                        {plan.discount_cents > 0 && (
                            <div className="flex justify-between text-sm text-primary">
                                <span>Desconto</span>
                                <span className="font-mono">- {formatBRL(plan.discount_cents)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-baseline pt-3 border-t border-line">
                            <span className="eyebrow">Total do plano</span>
                            <span className="metric-num text-3xl">{formatBRL(plan.final_cents)}</span>
                        </div>
                    </div>

                    {plan.payment_options && (
                        <div className="mt-6 border-t border-line pt-4">
                            <div className="eyebrow mb-2">Formas de pagamento</div>
                            <div className="text-sm text-ink-muted space-y-1">
                                <div>• À vista com desconto de {Math.round((plan.payment_options.cash_discount_pct || 0) * 100)}%</div>
                                <div>• Parcelamento em até {(plan.payment_options.installments || [10]).slice(-1)[0]}x sem juros</div>
                            </div>
                        </div>
                    )}

                    {!accepting && plan.status !== "accepted" && plan.status !== "rejected" && (
                        <div className="mt-8 grid grid-cols-2 gap-3">
                            <button
                                onClick={reject}
                                data-testid={PUBLIC_PLAN.rejectBtn}
                                className="py-3 rounded-md border border-line text-ink-muted hover:bg-bg-hover text-sm inline-flex items-center justify-center gap-2"
                            >
                                <X size={14} /> Rejeitar
                            </button>
                            <button
                                onClick={() => setAccepting(true)}
                                data-testid={PUBLIC_PLAN.acceptBtn}
                                className="py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 inline-flex items-center justify-center gap-2"
                            >
                                <Check size={14} /> Aceitar plano
                            </button>
                        </div>
                    )}

                    {(plan.status === "accepted" || plan.status === "rejected") && (
                        <div className="mt-6 text-center text-sm text-ink-muted">
                            Este plano já está com status <span className="text-ink font-mono uppercase">{plan.status}</span>.
                        </div>
                    )}

                    {accepting && (
                        <div className="mt-8 border-t border-line pt-6 space-y-4">
                            <div className="eyebrow flex items-center gap-2"><Shield size={12} /> Confirme seus dados · LGPD</div>
                            <div>
                                <label className="eyebrow block mb-1">Nome completo</label>
                                <input
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    className="w-full bg-bg-alt border border-line rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="eyebrow block mb-1">CPF</label>
                                    <input
                                        value={form.cpf}
                                        onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                                        placeholder="000.000.000-00"
                                        className="w-full bg-bg-alt border border-line rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="eyebrow block mb-1">Telefone</label>
                                    <input
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="(86) 98765-4321"
                                        className="w-full bg-bg-alt border border-line rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>
                            <label className="flex items-start gap-2 text-xs text-ink-muted leading-relaxed cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.lgpd_agreed}
                                    onChange={(e) => setForm({ ...form, lgpd_agreed: e.target.checked })}
                                    className="mt-0.5 accent-[hsl(var(--accent))]"
                                />
                                <span>
                                    Declaro que os dados acima são meus e concordo com o uso conforme a LGPD para fins de operação clínica e comunicação sobre este plano.
                                </span>
                            </label>
                            <button
                                onClick={submitAccept}
                                data-testid={PUBLIC_PLAN.submitAccept}
                                className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                            >
                                Confirmar aceite
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center text-xs text-ink-dim font-mono">
                    FlipSchedule · {tenant.name} · plano válido até {new Date(plan.expires_at || Date.now()).toLocaleDateString("pt-BR")}
                </div>
            </div>
        </div>
    );
}
