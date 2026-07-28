"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavigationItemData } from "@/lib/types/navigation";
import { cn } from "@/lib/utils";

export function NavigationItem({ item, onNavigate }: Readonly<{ item: NavigationItemData; onNavigate?: () => void }>) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors", active ? "bg-bg-hover text-ink" : "text-ink-muted hover:bg-bg-hover hover:text-ink")}>
      <Icon aria-hidden="true" size={17} className={active ? "text-primary" : "text-ink-dim"} />
      <span>{item.label}</span>
    </Link>
  );
}
