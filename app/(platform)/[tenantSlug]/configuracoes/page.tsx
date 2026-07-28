import { FoundationPage } from "@/components/foundation/foundation-page";

interface ConfiguracoesPageProps { params: Promise<{ tenantSlug: string }>; }

export default async function ConfiguracoesPage({ params }: ConfiguracoesPageProps) {
  const { tenantSlug } = await params;
  return <FoundationPage title="Configuracoes" context={`Tenant: ${tenantSlug}`} />;
}
