import { FoundationPage } from "@/components/foundation/foundation-page";

interface DashboardPageProps { params: Promise<{ tenantSlug: string }>; }

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenantSlug } = await params;
  return <FoundationPage title="Dashboard" context={`Tenant: ${tenantSlug}`} />;
}
