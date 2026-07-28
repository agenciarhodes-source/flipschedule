import { LogOut } from "lucide-react";
import Link from "next/link";

import { NavigationItem } from "@/components/layout/navigation-item";
import { TenantDisplay } from "@/components/layout/tenant-display";
import { PRODUCT_NAME } from "@/lib/constants/product";
import { createPlatformNavigation } from "@/lib/constants/platform-navigation";

export function PlatformSidebar({ tenantName, tenantSlug }: Readonly<{ tenantName: string; tenantSlug: string }>) {
  return (
    <aside aria-label="Navegação da plataforma" className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-bg-alt lg:flex">
      <div className="px-5 py-6"><p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-dim">Flip · Schedule</p><Link href="/" className="mt-1 block font-display text-2xl leading-tight">Flip<em className="not-italic text-primary">Schedule</em><span className="sr-only">{PRODUCT_NAME}</span></Link></div>
      <div className="mb-2 px-3"><TenantDisplay name={tenantName} /></div>
      <nav aria-label="Principal" className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">{createPlatformNavigation(tenantSlug).map((item) => <NavigationItem key={item.href} item={item} />)}</nav>
      <div className="border-t border-line p-3"><button type="button" className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-bg-hover hover:text-ink"><LogOut aria-hidden="true" size={16} />Sair</button></div>
    </aside>
  );
}
