import { PlatformShell } from "@/components/layout/platform-shell";
import { getDemoTenant } from "@/domains/demo/demo-tenants";

export default async function PlatformLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ tenantSlug: string }> }>) {
  const { tenantSlug } = await params;
  const tenant = getDemoTenant(tenantSlug);
  return <PlatformShell tenantName={tenant.name} tenantSlug={tenant.slug}>{children}</PlatformShell>;
}
