"use client";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NavigationItem } from "@/components/layout/navigation-item";
import { DemoBadge } from "@/components/shared/demo-badge";
import { UnitSelector } from "@/components/app-shell/unit-selector";
import { demoNavigation } from "@/lib/demo/navigation";
import { cn } from "@/lib/utils";

export function DemoSidebar() { const [collapsed, setCollapsed] = useState(false); return <aside aria-label="Navegação da demonstração" className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-bg-alt transition-[width] lg:flex", collapsed ? "w-[76px]" : "w-64")}><div className="px-4 py-5"><Link href="/demo/dashboard" aria-label="FlipSchedule — início da demonstração" className="block overflow-hidden whitespace-nowrap font-display text-2xl">Flip<span className="text-primary">Schedule</span></Link>{!collapsed ? <div className="mt-3"><DemoBadge /></div> : null}</div>{!collapsed ? <div className="px-3"><p className="mb-2 truncate text-sm font-medium">Clínica Aurora</p><UnitSelector /></div> : null}<nav aria-label="Principal" className="mt-4 flex-1 space-y-1 overflow-y-auto px-2">{demoNavigation.map((item) => <NavigationItem key={item.href} item={item} hideLabel={collapsed} />)}</nav><button type="button" aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"} onClick={() => setCollapsed((value) => !value)} className="m-3 flex min-h-11 items-center justify-center gap-2 rounded-md border border-line text-sm text-ink-muted hover:bg-bg-hover">{collapsed ? <ChevronsRight aria-hidden="true" size={17} /> : <><ChevronsLeft aria-hidden="true" size={17} />Recolher</>}</button></aside>; }
