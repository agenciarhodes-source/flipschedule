import { SessionInactivityGuard } from "@/components/auth/session-inactivity-guard";
import { PlatformShell } from "@/components/layout/platform-shell";
import { StagingBanner } from "@/components/layout/staging-banner";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";
import { notFound } from "next/navigation";

export default async function PlatformLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}>) {
  const { tenantSlug } = await params;
  const context = await requireAuthenticatedTenantContext(tenantSlug);
  if (tenantSlug !== context.tenantSlug) notFound();

  return (
    <SessionInactivityGuard>
      <StagingBanner tenantSlug={context.tenantSlug} />
      <PlatformShell
        tenantName={context.tenantName}
        tenantSlug={context.tenantSlug}
        tenants={context.availableTenants}
      >
        {children}
      </PlatformShell>
    </SessionInactivityGuard>
  );
}
