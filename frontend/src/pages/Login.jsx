import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listTenants, seedDemo } from "@/lib/api";
import { LOGIN } from "@/constants/testIds";
import { toast } from "sonner";

export default function Login() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        listTenants().then(setTenants).catch(() => setTenants([]));
    }, []);

    const enterDemo = async () => {
        setLoading(true);
        try {
            let list = tenants;
            if (!list.length) {
                await seedDemo();
                list = await listTenants();
                setTenants(list);
            }
            const slug = list[0]?.slug || "clinica-vitalita";
            toast.success("Bem-vindo à demo");
            navigate(`/${slug}/dashboard`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="font-display text-4xl">
                        Flip<em className="text-primary not-italic">Schedule</em>
                    </div>
                    <div className="eyebrow mt-3">Acesso · demonstração</div>
                </div>

                <div className="card-surface p-8 space-y-5">
                    <div className="text-sm text-ink-muted leading-relaxed">
                        Esta é uma demonstração pública do produto. Autenticação real (magic-link)
                        será integrada em fase futura.
                    </div>

                    <button
                        onClick={enterDemo}
                        disabled={loading}
                        data-testid={LOGIN.demoBtn}
                        className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60"
                    >
                        {loading ? "Carregando…" : "Entrar como Clínica Vitalità"}
                    </button>

                    {tenants.length > 1 && (
                        <div className="pt-3 border-t border-line">
                            <div className="eyebrow mb-3">Outras clínicas</div>
                            <div className="space-y-2">
                                {tenants.map((t) => (
                                    <button
                                        key={t.slug}
                                        onClick={() => navigate(`/${t.slug}/dashboard`)}
                                        className="w-full text-left px-3 py-2 rounded-md border border-line hover:bg-bg-hover text-sm"
                                    >
                                        {t.name}
                                        <span className="ml-2 text-ink-dim font-mono text-xs">/{t.slug}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center text-xs text-ink-dim font-mono">
                    Sistema em pt-BR · dark mode · fuso America/Sao_Paulo
                </div>
            </div>
        </div>
    );
}
