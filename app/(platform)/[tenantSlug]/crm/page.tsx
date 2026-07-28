import { FoundationPage } from "@/components/foundation/foundation-page";

interface CrmPageProps { params: Promise<{ tenantSlug: string }>; }

export default async function CrmPage({ params }: CrmPageProps) {
  const { tenantSlug } = await params;
  return <FoundationPage title="Crm" context={`Tenant: ${tenantSlug}`} />;
}
