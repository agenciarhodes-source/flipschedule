const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
export function formatDate(iso: string): string { return dateFormatter.format(new Date(iso)); }
export function formatWeekday(iso: string): string { return weekdayFormatter.format(new Date(iso)).replace(".", ""); }
export function formatTime(iso: string): string { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(iso)); }
