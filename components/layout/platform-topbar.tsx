import { Search } from "lucide-react";

import { MobileNavigation } from "@/components/layout/mobile-navigation";

export function PlatformTopbar({ tenantName, tenantSlug }: Readonly<{ tenantName: string; tenantSlug: string }>) {
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date());
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-bg-alt/40 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileNavigation tenantName={tenantName} tenantSlug={tenantSlug} />
        <span aria-hidden="true" className="hidden h-2 w-2 rounded-full bg-primary sm:block" />
        <span className="hidden font-mono text-[11px] uppercase tracking-widest text-ink-dim sm:inline">{date}</span>
        <span className="truncate text-sm text-ink-muted sm:hidden">{tenantName}</span>
      </div>
      <div aria-label="Busca indisponível nesta fase" className="hidden w-72 items-center gap-2 rounded-md border border-line bg-bg-elev px-3 py-1.5 text-sm text-ink-muted md:flex"><Search aria-hidden="true" size={14} /><span className="text-ink-dim">Buscar paciente, orçamento…</span></div>
    </header>
  );
}
