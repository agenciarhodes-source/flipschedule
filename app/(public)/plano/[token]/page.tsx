import { FoundationPage } from "@/components/foundation/foundation-page";

interface PublicPlanPageProps { params: Promise<{ token: string }>; }

export default async function PublicPlanPage({ params }: PublicPlanPageProps) {
  const { token } = await params;
  return <FoundationPage title="Plano público" context={`Token de demonstração: ${token}`} />;
}
