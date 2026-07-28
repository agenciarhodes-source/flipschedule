export interface DemoDashboardMetric { label: string; value: number; format: "currency" | "percentage" | "number"; delta: string; }
export const demoDashboard = {
 revenueCents: 18742000,
 metrics: [{label:"Receita realizada",value:18742000,format:"currency",delta:"+47%"},{label:"Fechamento",value:58,format:"percentage",delta:"+22pp"},{label:"Comparecimento",value:91,format:"percentage",delta:"+14pp"},{label:"Novos pacientes",value:24,format:"number",delta:"+8"}] as readonly DemoDashboardMetric[],
 revenueSeries: [42,55,48,72,68,86,94] as readonly number[],
 procedures: [{name:"Implantes",count:18},{name:"Ortodontia",count:15},{name:"Estética",count:12}] as const,
 funnel: [{label:"Leads",value:82},{label:"Avaliações",value:46},{label:"Propostas",value:31},{label:"Aceites",value:18}] as const,
 alerts: ["3 horários vagos amanhã", "5 propostas aguardam retorno", "2 conversas não lidas"] as const,
};
