import { FoundationPage } from "@/components/foundation/foundation-page";

interface PacientesPageProps { params: Promise<{ tenantSlug: string }>; }

export default async function PacientesPage({ params }: PacientesPageProps) {
  const { tenantSlug } = await params;
  return <FoundationPage title="Pacientes" context={`Tenant: ${tenantSlug}`} />;
}
