import { PlatformShell } from "@/components/layout/platform-shell";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";
import { notFound } from "next/navigation";

export default async function PlatformLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ tenantSlug: string }> }>) {
  const { tenantSlug } = await params;
  const context = await requireAuthenticatedTenantContext();
  if (tenantSlug !== context.tenantSlug) notFound();
  return <PlatformShell tenantName={context.tenantName} tenantSlug={context.tenantSlug}>{children}</PlatformShell>;
}
