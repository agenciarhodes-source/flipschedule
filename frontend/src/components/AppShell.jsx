import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import {
    LayoutDashboard,
    CalendarClock,
    MessageSquare,
    Users,
    FileText,
    UserRound,
    Settings,
    LogOut,
    Search,
} from "lucide-react";
import { getTenant } from "@/lib/api";
import { SHELL } from "@/constants/testIds";
import { cn } from "@/lib/utils";

const NAV = [
    { to: "dashboard", label: "Dashboard", icon: LayoutDashboard, tid: SHELL.navDashboard },
    { to: "agenda", label: "Agenda", icon: CalendarClock, tid: SHELL.navAgenda },
    { to: "inbox", label: "Inbox", icon: MessageSquare, tid: SHELL.navInbox },
    { to: "crm", label: "CRM", icon: Users, tid: SHELL.navCrm },
    { to: "orcamentos", label: "Orçamentos", icon: FileText, tid: SHELL.navOrcamentos },
    { to: "pacientes", label: "Pacientes", icon: UserRound, tid: SHELL.navPacientes },
    { to: "configuracoes", label: "Configurações", icon: Settings, tid: SHELL.navConfig },
];

export default function AppShell() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [tenant, setTenant] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        getTenant(slug)
            .then(setTenant)
            .catch(() => setError(true));
    }, [slug]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4">
                <div className="eyebrow">tenant não encontrado</div>
                <div className="font-display text-4xl">Clínica <em className="text-primary not-italic">não localizada</em>.</div>
                <button
                    onClick={() => navigate("/")}
                    className="mt-3 px-4 py-2 rounded-md border border-line hover:bg-bg-hover text-sm"
                >
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-bg text-ink">
            {/* Sidebar */}
            <aside
                data-testid={SHELL.sidebar}
                className="w-[240px] shrink-0 border-r border-line bg-bg-alt flex flex-col h-screen sticky top-0"
            >
                <div className="px-5 py-6">
                    <div className="eyebrow">Flip · Schedule</div>
                    <div className="font-display text-2xl mt-1 leading-tight">
                        Flip<em className="text-primary not-italic">Schedule</em>
                    </div>
                </div>

                <div className="px-3 mb-2">
                    <div
                        className="px-2 py-2 rounded-md border border-line bg-bg-elev"
                        data-testid={SHELL.tenantName}
                    >
                        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-dim">
                            Clínica ativa
                        </div>
                        <div className="text-sm truncate mt-0.5">{tenant?.name || "—"}</div>
                    </div>
                </div>

                <nav className="flex-1 px-2 py-2 space-y-0.5 scrollbar-thin overflow-y-auto">
                    {NAV.map(({ to, label, icon: Icon, tid }) => (
                        <NavLink
                            key={to}
                            to={to}
                            data-testid={tid}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                    isActive
                                        ? "bg-bg-hover text-ink"
                                        : "text-ink-muted hover:bg-bg-hover hover:text-ink"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon
                                        size={17}
                                        className={isActive ? "text-primary" : "text-ink-dim"}
                                    />
                                    <span>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 border-t border-line">
                    <button
                        onClick={() => navigate("/")}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-muted hover:bg-bg-hover hover:text-ink"
                    >
                        <LogOut size={16} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main area */}
            <div className="flex-1 min-w-0 flex flex-col">
                <header className="h-14 border-b border-line px-6 flex items-center justify-between bg-bg-alt/40 backdrop-blur">
                    <div className="flex items-center gap-3 text-sm text-ink-muted">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="font-mono uppercase tracking-widest text-[11px] text-ink-dim">
                            {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-line rounded-md bg-bg-elev text-sm text-ink-muted w-72">
                            <Search size={14} />
                            <span className="text-ink-dim">Buscar paciente, orçamento…</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
                    <Outlet context={{ tenant, slug }} />
                </main>
            </div>
        </div>
    );
}
