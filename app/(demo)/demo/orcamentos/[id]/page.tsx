import { PlanDetailView } from "@/components/modules/treatment-plans/plan-detail-view";
import { DemoNotFound } from "@/components/shared/demo-not-found";
import { demoTreatmentPlans } from "@/domains/demo";

export default async function DemoPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!demoTreatmentPlans.some((plan) => plan.id === id)) return <DemoNotFound kind="Orçamento" returnHref="/demo/orcamentos" returnLabel="Voltar para orçamentos" />;
  return <PlanDetailView planId={id} />;
}
