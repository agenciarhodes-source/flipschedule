import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { listTenants, seedDemo } from "@/lib/api";
import { LANDING } from "@/constants/testIds";
import { formatBRLCompact } from "@/lib/format";

const HERO_KPIS = [
    { label: "Receita realizada", value: "R$ 187k", delta: "+47%", positive: true },
    { label: "Fechamento", value: "58%", delta: "+22pp", positive: true },
    { label: "Comparecimento", value: "91%", delta: "+14pp", positive: true },
    { label: "Tempo de resposta", value: "1m48s", delta: "-92%", positive: true },
    { label: "CAC", value: "R$ 174", delta: "-38%", positive: true },
];

export default function Landing() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);

    useEffect(() => {
        listTenants().then(setTenants).catch(() => setTenants([]));
    }, []);

    const enter = async () => {
        let list = tenants;
        if (!list.length) {
            await seedDemo();
            list = await listTenants();
            setTenants(list);
        }
        const slug = list[0]?.slug || "clinica-vitalita";
        navigate(`/${slug}/dashboard`);
    };

    return (
        <div className="min-h-screen bg-bg text-ink relative overflow-hidden">
            {/* subtle grain overlay */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage:
                        "radial-gradient(hsl(129 61% 74%) 0.5px, transparent 0.5px)",
                    backgroundSize: "24px 24px",
                }}
            />

            {/* Top nav */}
            <header className="relative z-10 px-8 py-5 flex items-center justify-between border-b border-line">
                <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl">
                        Flip<em className="text-primary not-italic">Schedule</em>
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-dim">
                        · v0.1 · pt-BR
                    </span>
                </div>
                <nav className="hidden md:flex items-center gap-8 text-sm text-ink-muted">
                    <a href="#produto" className="hover:text-ink">O produto</a>
                    <a href="#numeros" className="hover:text-ink">Números</a>
                    <a href="#quem" className="hover:text-ink">Para quem</a>
                    <button
                        onClick={enter}
                        data-testid={LANDING.ctaAccess}
                        className="text-primary hover:text-primary/80 font-medium"
                    >
                        Acessar sistema →
                    </button>
                </nav>
            </header>

            {/* Hero */}
            <section className="relative z-10 max-w-6xl mx-auto px-8 pt-24 pb-20">
                <div className="eyebrow mb-6">Setembro · 2026 · Piauí</div>
                <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.05] max-w-4xl">
                    Sua clínica <em className="text-primary not-italic">não precisa</em> de mais uma agência.
                    <br />Precisa de uma <em className="text-primary not-italic">operação</em>.
                </h1>
                <p className="mt-8 text-ink-muted text-lg max-w-2xl leading-relaxed">
                    Time completo, sistema proprietário e rastreio real do que virou receita
                    em cadeira. Agenda, WhatsApp, CRM, orçamento e BI —
                    <span className="text-ink"> operados por quem entende clínica</span>.
                </p>

                <div className="mt-10 flex flex-wrap items-center gap-4">
                    <button
                        onClick={enter}
                        data-testid={LANDING.ctaDemo}
                        className="group inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
                    >
                        Entrar na demo
                        <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                    </button>
                    <div className="text-sm text-ink-dim font-mono">
                        Sem cadastro · Clínica Vitalità · 4 profissionais · 15 pacientes
                    </div>
                </div>

                {/* KPI panel */}
                <div className="mt-20 card-surface p-8">
                    <div className="eyebrow mb-6">Piloto zero · Últimos 30 dias</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8">
                        {HERO_KPIS.map((k, i) => (
                            <div
                                key={i}
                                className="border-l-2 border-line pl-4 animate-fade-in"
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                <div className="eyebrow mb-1">{k.label}</div>
                                <div className="metric-num text-4xl leading-none">{k.value}</div>
                                <div className={`mt-2 text-xs font-mono ${k.positive ? "text-primary" : "text-danger"}`}>
                                    Δ {k.delta}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features / product */}
            <section id="produto" className="relative z-10 max-w-6xl mx-auto px-8 py-16 border-t border-line">
                <div className="eyebrow mb-6">O que está incluído</div>
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        { title: "Agenda com drag & drop", body: "Arrasta consulta entre profissionais, valida conflito, avisa em tempo real." },
                        { title: "Inbox unificada", body: "WhatsApp, Instagram e formulário no mesmo lugar. Sem perder mensagem." },
                        { title: "CRM em Kanban", body: "Do lead ao paciente, com motivo de perda e origem real da campanha." },
                        { title: "Orçamento com aceite público", body: "Link do plano vai por WhatsApp; paciente aceita pelo celular." },
                        { title: "Régua de recuperação", body: "48h, 24h, 3h. Reduz no-show para menos de 10%." },
                        { title: "Dashboard clínica", body: "Faturamento em cadeira, ocupação, ticket médio — tudo por origem." },
                    ].map((f, i) => (
                        <div key={i} className="card-surface p-6 hover:border-line-strong transition">
                            <div className="font-display text-2xl mb-2">{f.title}</div>
                            <p className="text-sm text-ink-muted leading-relaxed">{f.body}</p>
                            <ChevronRight size={16} className="mt-4 text-primary" />
                        </div>
                    ))}
                </div>
            </section>

            {/* Numbers */}
            <section id="numeros" className="relative z-10 max-w-6xl mx-auto px-8 py-20 border-t border-line">
                <div className="grid md:grid-cols-2 gap-16 items-start">
                    <div>
                        <div className="eyebrow mb-4">Missão de negócio</div>
                        <h2 className="font-display text-4xl md:text-5xl leading-tight">
                            Reduzir no-show. Aumentar <em className="text-primary not-italic">fechamento</em>. Provar ROI.
                        </h2>
                    </div>
                    <div className="space-y-6">
                        {[
                            ["No-show", "25% → 8%", "-17pp"],
                            ["Fechamento de orçamento", "35% → 58%", "+23pp"],
                            ["Tempo médio de resposta", "2h → 1m48s", "-92%"],
                        ].map(([label, val, delta], i) => (
                            <div key={i} className="flex items-baseline justify-between border-b border-line pb-4">
                                <div>
                                    <div className="eyebrow">{label}</div>
                                    <div className="metric-num text-3xl mt-1">{val}</div>
                                </div>
                                <div className="text-primary font-mono text-sm">Δ {delta}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="quem" className="relative z-10 max-w-6xl mx-auto px-8 py-12 border-t border-line">
                <div className="flex flex-wrap items-center justify-between gap-6 text-sm text-ink-dim">
                    <div>
                        <span className="font-display text-xl text-ink">FlipSchedule</span>
                        <span className="ml-3 font-mono text-xs">para clínicas com 2 a 12 cadeiras · pt-BR</span>
                    </div>
                    <div className="font-mono text-xs">© 2026 · MVP</div>
                </div>
            </footer>
        </div>
    );
}
