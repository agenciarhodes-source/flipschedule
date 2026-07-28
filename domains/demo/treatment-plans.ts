export type DemoPlanStatus = "draft" | "sent" | "accepted" | "rejected";
export interface DemoPlanItem { description: string; quantity: number; unitPriceCents: number; }
export interface DemoTreatmentPlan { id: string; patientName: string; title: string; professionalName: string; items: readonly DemoPlanItem[]; totalCents: number; status: DemoPlanStatus; createdAt: string; expiresAt: string; }
export const demoTreatmentPlans: readonly DemoTreatmentPlan[] = [
 { id:"plan-demo", patientName:"Marina Alves", title:"Plano de reabilitação estética", professionalName:"Dra. Ana Ribeiro", items:[{description:"Clareamento",quantity:1,unitPriceCents:120000},{description:"Faceta em resina",quantity:4,unitPriceCents:85000}], totalCents:460000, status:"sent", createdAt:"2026-09-10T12:00:00.000Z", expiresAt:"2026-10-10T23:59:59.000Z" },
 { id:"plan-2", patientName:"João Pedro Lima", title:"Implante unitário", professionalName:"Dr. Caio Mendes", items:[{description:"Implante unitário",quantity:1,unitPriceCents:380000}], totalCents:380000, status:"accepted", createdAt:"2026-09-08T10:00:00.000Z", expiresAt:"2026-10-08T23:59:59.000Z" },
];
export const demoPlanStatusLabels: Record<DemoPlanStatus,string> = { draft:"Rascunho", sent:"Enviado", accepted:"Aceito", rejected:"Rejeitado" };
