import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { PlatformTopbar } from "@/components/layout/platform-topbar";

export function PlatformShell({ children, tenantName, tenantSlug,tenants=[] }: Readonly<{ children: React.ReactNode; tenantName: string; tenantSlug: string;tenants?:{membershipId:string;tenantSlug:string;tenantName:string}[] }>) {
  return <div className="flex min-h-screen bg-bg text-ink"><PlatformSidebar tenantName={tenantName} tenantSlug={tenantSlug} /><div className="flex min-h-screen min-w-0 flex-1 flex-col">{tenants.length>1?<form action="/api/tenant-preference" method="post" className="border-b border-line bg-bg-elev px-4 py-2 text-sm"><label>Organização <select name="tenantSlug" defaultValue={tenantSlug} className="ml-2 rounded border border-line bg-bg px-2 py-1" onChange={undefined}>{tenants.map(x=><option key={x.membershipId} value={x.tenantSlug}>{x.tenantName}</option>)}</select></label><button className="ml-2 text-primary">Trocar</button></form>:null}<PlatformTopbar tenantName={tenantName} tenantSlug={tenantSlug} /><main className="min-w-0 flex-1 overflow-y-auto p-page">{children}</main></div></div>;
}
