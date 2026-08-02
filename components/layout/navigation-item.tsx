"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavigationItemData } from "@/lib/types/navigation";
import { cn } from "@/lib/utils";

type NavigationItemProps = Readonly<{
  item: NavigationItemData;
  onNavigate?: () => void;
  hideLabel?: boolean;
}>;

export function NavigationItem({
  item,
  onNavigate,
  hideLabel = false,
}: NavigationItemProps) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  const Icon = item.icon;

  const optionalLinkProps = {
    ...(onNavigate ? { onClick: onNavigate } : {}),
    ...(active ? { "aria-current": "page" as const } : {}),
  };

  return (
    <Link
      href={item.href}
      {...optionalLinkProps}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-bg-hover text-ink"
          : "text-ink-muted hover:bg-bg-hover hover:text-ink",
      )}
    >
      <Icon
        aria-hidden="true"
        size={17}
        className={active ? "text-primary" : "text-ink-dim"}
      />
      <span className={hideLabel ? "sr-only" : undefined}>{item.label}</span>
    </Link>
  );
}
