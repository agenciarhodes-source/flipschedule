export type DemoLeadStage = "new" | "contacted" | "evaluation" | "proposal";
export interface DemoLead { id: string; name: string; source: string; stage: DemoLeadStage; estimatedValueCents: number; createdAt: string; }
export const demoLeadStages: readonly { id: DemoLeadStage; label: string }[] = [{id:"new",label:"Novos"},{id:"contacted",label:"Em contato"},{id:"evaluation",label:"Avaliação"},{id:"proposal",label:"Proposta"}];
export const demoLeads: readonly DemoLead[] = [
 { id:"lead-1", name:"Camila Rocha", source:"Instagram", stage:"new", estimatedValueCents:180000, createdAt:"2026-09-15T11:00:00.000Z" },
 { id:"lead-2", name:"Rafael Sousa", source:"Indicação", stage:"contacted", estimatedValueCents:320000, createdAt:"2026-09-14T16:00:00.000Z" },
 { id:"lead-3", name:"Fernanda Melo", source:"Google", stage:"evaluation", estimatedValueCents:450000, createdAt:"2026-09-12T13:00:00.000Z" },
 { id:"lead-4", name:"Lucas Freitas", source:"WhatsApp", stage:"proposal", estimatedValueCents:680000, createdAt:"2026-09-10T09:30:00.000Z" },
];
