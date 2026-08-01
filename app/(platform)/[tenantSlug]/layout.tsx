import { PlatformShell } from "@/components/layout/platform-shell";
import { getDemoTenant } from "@/domains/demo/demo-tenants";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";

export default async function PlatformLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ tenantSlug: string }> }>) {
  const { tenantSlug } = await params;
  const tenant = getDemoTenant(tenantSlug);
  await requireAuthenticatedTenantContext();
  return <PlatformShell tenantName={tenant.name} tenantSlug={tenant.slug}>{children}</PlatformShell>;
}
