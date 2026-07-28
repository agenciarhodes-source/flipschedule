import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Send, Search } from "lucide-react";
import { tApi } from "@/lib/api";
import { INBOX } from "@/constants/testIds";
import { formatRelative, formatTime, initials, formatPhoneBR } from "@/lib/format";

const CHANNEL_LABEL = {
    whatsapp: "WHATSAPP",
    instagram: "INSTAGRAM",
    facebook_messenger: "MESSENGER",
    form: "FORMULÁRIO",
};

const CHANNEL_COLOR = {
    whatsapp: "text-primary",
    instagram: "text-warm",
    facebook_messenger: "text-info",
    form: "text-ink-muted",
};

export default function Inbox() {
    const { slug } = useOutletContext();
    const [convs, setConvs] = useState([]);
    const [selected, setSelected] = useState(null);
    const [msgs, setMsgs] = useState([]);
    const [draft, setDraft] = useState("");
    const [filter, setFilter] = useState("");
    const scrollRef = useRef(null);

    const loadConvs = async () => {
        const c = await tApi(slug).conversations();
        setConvs(c);
        if (!selected && c[0]) setSelected(c[0]);
    };

    useEffect(() => {
        if (slug) loadConvs();
        // eslint-disable-next-line
    }, [slug]);

    const loadMsgs = async () => {
        if (!selected) return;
        const m = await tApi(slug).messages(selected.id);
        setMsgs(m);
        setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 30);
    };

    useEffect(() => {
        loadMsgs();
        // eslint-disable-next-line
    }, [selected?.id]);

    const send = async () => {
        if (!draft.trim() || !selected) return;
        const text = draft;
        setDraft("");
        await tApi(slug).sendMessage(selected.id, text);
        await loadMsgs();
        // simulate reply arriving 1.2s later
        setTimeout(loadMsgs, 1300);
    };

    const filtered = useMemo(() => {
        if (!filter) return convs;
        return convs.filter((c) => c.patient?.full_name?.toLowerCase().includes(filter.toLowerCase()));
    }, [convs, filter]);

    return (
        <div className="h-[calc(100vh-56px)] flex overflow-hidden">
            {/* Left: conversations */}
            <div className="w-[320px] shrink-0 border-r border-line flex flex-col">
                <div className="px-4 py-4 border-b border-line">
                    <div className="eyebrow">Inbox</div>
                    <h2 className="font-display text-2xl mt-1">Mensagens</h2>
                    <div className="mt-3 flex items-center gap-2 px-3 py-1.5 border border-line rounded-md bg-bg-elev text-sm">
                        <Search size={13} className="text-ink-dim" />
                        <input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Buscar…"
                            className="bg-transparent outline-none flex-1 text-sm placeholder:text-ink-dim"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {filtered.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setSelected(c)}
                            data-testid={INBOX.conversation}
                            className={`w-full text-left px-4 py-3 border-b border-line/50 hover:bg-bg-hover ${
                                selected?.id === c.id ? "bg-bg-hover" : ""
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-full bg-bg-elev flex items-center justify-center text-[11px] font-mono">
                                    {initials(c.patient?.full_name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <div className="text-sm truncate">{c.patient?.full_name || "—"}</div>
                                        <div className="font-mono text-[10px] text-ink-dim">
                                            {formatRelative(c.last_message_at)}
                                        </div>
                                    </div>
                                    <div className="text-xs text-ink-muted truncate mt-0.5">
                                        {c.last_message_preview || "—"}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`font-mono text-[9px] uppercase tracking-widest ${CHANNEL_COLOR[c.channel]}`}>
                                            {CHANNEL_LABEL[c.channel]}
                                        </span>
                                        {c.unread_count > 0 && (
                                            <span className="ml-auto h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-mono flex items-center justify-center">
                                                {c.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                    {!filtered.length && (
                        <div className="p-8 text-center text-sm text-ink-dim">Nenhuma conversa</div>
                    )}
                </div>
            </div>

            {/* Center: thread */}
            <div className="flex-1 min-w-0 flex flex-col">
                {selected ? (
                    <>
                        <div className="h-14 border-b border-line px-6 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-bg-elev flex items-center justify-center text-[11px] font-mono">
                                {initials(selected.patient?.full_name)}
                            </div>
                            <div>
                                <div className="text-sm">{selected.patient?.full_name}</div>
                                <div className="font-mono text-[10px] text-ink-dim">
                                    {formatPhoneBR(selected.patient?.phone)} · {CHANNEL_LABEL[selected.channel]}
                                </div>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-3">
                            {msgs.map((m) => {
                                const outbound = m.direction === "outbound";
                                return (
                                    <div
                                        key={m.id}
                                        className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                                                outbound
                                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                                    : "bg-bg-elev border border-line rounded-bl-sm"
                                            }`}
                                        >
                                            <div>{m.text_content}</div>
                                            <div
                                                className={`text-[10px] font-mono mt-1 ${
                                                    outbound ? "text-primary-foreground/60" : "text-ink-dim"
                                                }`}
                                            >
                                                {formatTime(m.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-line p-4 flex items-end gap-3">
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                data-testid={INBOX.composer}
                                placeholder="Escreva uma mensagem… (Enter para enviar)"
                                className="flex-1 bg-bg-elev border border-line rounded-md px-3 py-2 text-sm resize-none scrollbar-thin outline-none focus:border-primary/50"
                                rows={2}
                            />
                            <button
                                onClick={send}
                                data-testid={INBOX.send}
                                className="h-10 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 text-sm font-medium"
                            >
                                <Send size={14} /> Enviar
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-ink-dim">
                        Selecione uma conversa
                    </div>
                )}
            </div>

            {/* Right: patient info */}
            {selected?.patient && (
                <aside className="w-[280px] shrink-0 border-l border-line p-5 hidden lg:block">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-full bg-bg-elev flex items-center justify-center text-sm font-mono">
                            {initials(selected.patient.full_name)}
                        </div>
                        <div>
                            <div className="text-sm">{selected.patient.full_name}</div>
                            <div className="font-mono text-[10px] text-ink-dim">
                                {formatPhoneBR(selected.patient.phone)}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="eyebrow mb-1.5">Canal</div>
                            <div className="text-sm">{CHANNEL_LABEL[selected.channel]}</div>
                        </div>
                        <div>
                            <div className="eyebrow mb-1.5">LGPD</div>
                            <div className="text-sm text-primary">✓ Consentimento capturado</div>
                        </div>
                        <div>
                            <div className="eyebrow mb-1.5">Última interação</div>
                            <div className="text-sm">{formatRelative(selected.last_message_at)}</div>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
}
