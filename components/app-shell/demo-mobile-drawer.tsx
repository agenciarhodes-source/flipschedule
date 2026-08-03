"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { UnitSelector } from "@/components/app-shell/unit-selector";
import { NavigationItem } from "@/components/layout/navigation-item";
import { AccessibleDialog } from "@/components/shared/accessible-dialog";
import { DemoBadge } from "@/components/shared/demo-badge";
import { demoNavigation } from "@/lib/demo/navigation";

export function DemoMobileDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button ref={triggerRef} type="button" aria-label="Abrir menu principal" aria-expanded={open} aria-controls="demo-mobile-navigation" onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-bg-hover lg:hidden">
        <Menu aria-hidden="true" size={20} />
      </button>
      <AccessibleDialog open={open} title="Menu principal" description="Navegação do modo demonstração" onClose={() => setOpen(false)} initialFocusRef={closeRef} returnFocusRef={triggerRef} className="inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r">
        <header className="flex items-center justify-between p-4">
          <span className="font-display text-2xl">Flip<span className="text-primary">Schedule</span></span>
          <button ref={closeRef} type="button" aria-label="Fechar menu principal" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-md"><X aria-hidden="true" size={20} /></button>
        </header>
        <div className="space-y-3 px-3"><DemoBadge /><p className="text-sm font-medium">Clínica Aurora</p><UnitSelector /></div>
        <nav id="demo-mobile-navigation" aria-label="Principal — menu móvel" className="mt-4 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-4">{demoNavigation.map((item) => <NavigationItem key={item.href} item={item} onNavigate={() => setOpen(false)} />)}</nav>
      </AccessibleDialog>
    </>
  );
}
