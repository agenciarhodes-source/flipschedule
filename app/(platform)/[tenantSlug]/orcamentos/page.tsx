import { FoundationPage } from "@/components/foundation/foundation-page";

interface OrcamentosPageProps { params: Promise<{ tenantSlug: string }>; }

export default async function OrcamentosPage({ params }: OrcamentosPageProps) {
  const { tenantSlug } = await params;
  return <FoundationPage title="Orcamentos" context={`Tenant: ${tenantSlug}`} />;
}
