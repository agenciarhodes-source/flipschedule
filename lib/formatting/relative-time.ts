const REFERENCE_TIME = Date.parse("2026-09-15T15:00:00.000Z");
export function formatRelativeTime(iso: string): string { const seconds = Math.max(0, (REFERENCE_TIME - Date.parse(iso)) / 1000); if (seconds < 3600) return `há ${Math.max(1, Math.floor(seconds / 60))} min`; if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`; return `há ${Math.floor(seconds / 86400)}d`; }
