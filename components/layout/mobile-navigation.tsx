"use client";

import { LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NavigationItem } from "@/components/layout/navigation-item";
import { createPlatformNavigation } from "@/lib/constants/platform-navigation";
import { TenantDisplay } from "@/components/layout/tenant-display";

export function MobileNavigation({ tenantName, tenantSlug }: Readonly<{ tenantName: string; tenantSlug: string }>) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a, button:not([disabled])'));
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleKeyDown); };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button ref={triggerRef} type="button" aria-label="Abrir menu principal" aria-expanded={open} aria-controls="mobile-platform-navigation" onClick={() => setOpen(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-muted hover:bg-bg-hover hover:text-ink"><Menu aria-hidden="true" size={20} /></button>
      {open ? <div className="fixed inset-0 z-50" role="presentation"><button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={() => setOpen(false)} /><div ref={panelRef} id="mobile-platform-navigation" role="dialog" aria-modal="true" aria-label="Menu principal" className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-line bg-bg-alt shadow-subtle">
        <div className="flex items-center justify-between px-5 py-5"><span className="font-display text-2xl">Flip<em className="not-italic text-primary">Schedule</em></span><button type="button" aria-label="Fechar menu principal" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-muted hover:bg-bg-hover"><X aria-hidden="true" size={20} /></button></div>
        <div className="px-3"><TenantDisplay name={tenantName} /></div>
        <nav aria-label="Principal" className="mt-3 flex-1 space-y-1 overflow-y-auto px-2">{createPlatformNavigation(tenantSlug).map((item) => <NavigationItem key={item.href} item={item} onNavigate={() => setOpen(false)} />)}</nav>
        <div className="border-t border-line p-3"><button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-ink-muted"><LogOut aria-hidden="true" size={16} />Sair</button></div>
      </div></div> : null}
    </div>
  );
}
