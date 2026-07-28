import { FoundationPage } from "@/components/foundation/foundation-page";

interface AgendaPageProps { params: Promise<{ tenantSlug: string }>; }

export default async function AgendaPage({ params }: AgendaPageProps) {
  const { tenantSlug } = await params;
  return <FoundationPage title="Agenda" context={`Tenant: ${tenantSlug}`} />;
}
