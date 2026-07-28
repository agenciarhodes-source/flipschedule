import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents) {
    if (cents == null) return "—";
    return BRL.format(cents / 100);
}

export function formatBRLCompact(cents) {
    if (cents == null) return "—";
    const v = cents / 100;
    if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return BRL.format(v);
}

export function formatDate(iso, pattern = "dd/MM/yyyy") {
    if (!iso) return "";
    try {
        return format(typeof iso === "string" ? parseISO(iso) : iso, pattern, { locale: ptBR });
    } catch {
        return "";
    }
}

export function formatTime(iso) {
    return formatDate(iso, "HH:mm");
}

export function formatDateTime(iso) {
    return formatDate(iso, "dd/MM/yyyy · HH:mm");
}

export function formatRelative(iso) {
    if (!iso) return "";
    const d = typeof iso === "string" ? parseISO(iso) : iso;
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)}d`;
    return formatDate(iso);
}

export function formatPhoneBR(phone) {
    if (!phone) return "";
    // strip +55
    const digits = phone.replace(/\D/g, "").replace(/^55/, "");
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return phone;
}

export function toE164BR(input) {
    const digits = (input || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("55")) return `+${digits}`;
    return `+55${digits}`;
}

export function validateCPF(cpf) {
    const c = (cpf || "").replace(/\D/g, "");
    if (c.length !== 11) return false;
    if (/^(\d)\1+$/.test(c)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
    let d1 = 11 - (sum % 11);
    if (d1 >= 10) d1 = 0;
    if (d1 !== parseInt(c[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
    let d2 = 11 - (sum % 11);
    if (d2 >= 10) d2 = 0;
    return d2 === parseInt(c[10]);
}

export function initials(name) {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
}
