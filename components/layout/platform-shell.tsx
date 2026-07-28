import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { PlatformTopbar } from "@/components/layout/platform-topbar";

export function PlatformShell({ children, tenantName, tenantSlug }: Readonly<{ children: React.ReactNode; tenantName: string; tenantSlug: string }>) {
  return <div className="flex min-h-screen bg-bg text-ink"><PlatformSidebar tenantName={tenantName} tenantSlug={tenantSlug} /><div className="flex min-h-screen min-w-0 flex-1 flex-col"><PlatformTopbar tenantName={tenantName} tenantSlug={tenantSlug} /><main className="min-w-0 flex-1 overflow-y-auto p-page">{children}</main></div></div>;
}
