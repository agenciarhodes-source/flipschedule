import type { Appointment } from "./appointments";

export type ReportPeriod = "today" | "7d" | "30d" | "month" | "previous_month" | "custom";
export interface ReportFilters { period: ReportPeriod; start?: string; end?: string; unitId: string; professionalId: string; procedureId: string; channel: string; origin: string; status: string; owner: string }
export interface ReportMetric { id: string; label: string; value: number; format: "currency" | "number" | "percent" | "minutes"; previous: number; goal?: number }
export interface ReportSeries { label: string; values: number[]; color: string }
export interface SavedReportView { id: string; name: string; filters: ReportFilters }
export interface ProfessionalPerformance { id: string; name: string; appointments: number; revenueCents: number; averageTicketCents: number; occupancy: number; attendance: number; conversion: number; rating: number; returnRate: number; availableHours: number; usedHours: number }
export interface UnitPerformance { id: string; name: string; revenueCents: number; appointments: number; patients: number; conversion: number; occupancy: number; noShows: number; conversations: number; leads: number }

export const defaultReportFilters: ReportFilters = { period: "month", unitId: "", professionalId: "", procedureId: "", channel: "", origin: "", status: "", owner: "" };
export const reportPeriodLabels: Record<ReportPeriod, string> = { today: "Hoje", "7d": "Últimos 7 dias", "30d": "Últimos 30 dias", month: "Este mês", previous_month: "Mês anterior", custom: "Período personalizado" };
export const filterByPeriod = <T extends { startsAt: string }>(items: readonly T[], start: string, end: string) => items.filter((item) => item.startsAt.slice(0, 10) >= start && item.startsAt.slice(0, 10) <= end);
export const compareReportPeriods = (current: number, previous: number) => ({ difference: current - previous, percent: previous ? Math.round((current - previous) / previous * 1000) / 10 : 0 });
export const calculateTrend = (values: readonly number[]) => values.length < 2 ? 0 : compareReportPeriods(values.at(-1)!, values.at(-2)!).percent;
export const aggregateRevenue = (items: readonly Appointment[]) => items.filter((item) => item.status === "completed").reduce((sum, item) => sum + item.revenueCents, 0);
export const calculateReportAttendance = (items: readonly Appointment[]) => { const final = items.filter((item) => ["completed", "no_show"].includes(item.status)); return final.length ? Math.round(final.filter((item) => item.status === "completed").length / final.length * 100) : 0 };
export const calculateReportOccupancy = (usedMinutes: number, availableMinutes: number) => availableMinutes ? Math.min(100, Math.round(usedMinutes / availableMinutes * 100)) : 0;
export const calculateConversion = (won: number, total: number) => total ? Math.round(won / total * 100) : 0;
export function groupReportByProfessional(items: readonly Appointment[]) { return Object.groupBy(items, (item) => item.professionalId) }
export function groupByUnit(items: readonly Appointment[]) { return Object.groupBy(items, (item) => item.unitId) }
export const calculateSla = (openedAt: string, resolvedAt: string, targetMinutes: number) => { const minutes = Math.max(0, Math.round((new Date(resolvedAt).getTime() - new Date(openedAt).getTime()) / 60000)); return { minutes, met: minutes <= targetMinutes } };

const metric = (tuple: [string,string,number,ReportMetric["format"],number,number?]):ReportMetric => ({ id:tuple[0],label:tuple[1],value:tuple[2],format:tuple[3],previous:tuple[4],...(tuple[5]===undefined?{}:{goal:tuple[5]}) });
const metricGroups: Record<string, Parameters<typeof metric>[0][]> = {
  overview: [["revenue","Receita realizada",18742000,"currency",16690000,20000000],["forecast","Receita prevista",22480000,"currency",20500000,23000000],["appointments","Agendamentos",314,"number",288,330],["attendance","Comparecimento",91,"percent",87,92],["patients","Novos pacientes",48,"number",42,50],["conversion","Conversão comercial",58,"percent",54,60],["ticket","Ticket médio",142000,"currency",135000,150000],["occupancy","Ocupação",82,"percent",78,85],["messages","Mensagens atendidas",386,"number",352,400],["response","Primeira resposta",12,"minutes",18,10]],
  financial: [["revenue","Receita realizada",18742000,"currency",16690000],["forecast","Receita prevista",22480000,"currency",20500000],["open","Em aberto",3620000,"currency",3180000],["overdue","Vencidos",480000,"currency",620000],["discount","Descontos",740000,"currency",690000],["ticket","Ticket médio",142000,"currency",135000]],
  schedule: [["appointments","Agendamentos",314,"number",288],["confirmed","Confirmados",276,"number",251],["completed","Realizados",243,"number",224],["cancelled","Cancelados",19,"number",22],["no_show","Faltas",12,"number",16],["occupancy","Ocupação",82,"percent",78]],
  patients: [["active","Pacientes ativos",842,"number",810],["new","Novos pacientes",48,"number",42],["returning","Recorrentes",196,"number",182],["inactive","Inativos",73,"number",69],["no_return","Sem retorno",61,"number",55],["retention","Retenção",84,"percent",81]],
  commercial: [["leads","Leads",126,"number",114],["pipeline","Pipeline",28640000,"currency",25100000],["conversion","Conversão",58,"percent",54],["closing","Fechamento",8,"number",10],["accepted","Orçamentos aceitos",18,"number",16],["accepted_value","Valor aceito",9240000,"currency",8420000]],
  service: [["received","Conversas recebidas",452,"number",421],["resolved","Resolvidas",386,"number",352],["unread","Não lidas",24,"number",31],["overdue","Atrasadas",7,"number",11],["first","Primeira resposta",12,"minutes",18],["resolution","Resolução",94,"minutes",108]],
};
export const reportMetrics:Record<string,ReportMetric[]> = Object.fromEntries(Object.entries(metricGroups).map(([key,values])=>[key,values.map(metric)]));
export const professionalPerformance: ProfessionalPerformance[] = [
  { id:"prof-ana",name:"Dra. Mariana Costa",appointments:112,revenueCents:7240000,averageTicketCents:146000,occupancy:89,attendance:94,conversion:64,rating:4.9,returnRate:86,availableHours:132,usedHours:117 },
  { id:"prof-caio",name:"Dr. Rafael Lima",appointments:86,revenueCents:6810000,averageTicketCents:231000,occupancy:78,attendance:89,conversion:57,rating:4.8,returnRate:78,availableHours:118,usedHours:92 },
  { id:"prof-livia",name:"Dra. Camila Rocha",appointments:116,revenueCents:4692000,averageTicketCents:112000,occupancy:81,attendance:90,conversion:53,rating:4.7,returnRate:82,availableHours:140,usedHours:113 },
];
export const unitPerformance: UnitPerformance[] = [
  { id:"centro",name:"Centro",revenueCents:12180000,appointments:198,patients:612,conversion:61,occupancy:86,noShows:7,conversations:294,leads:82 },
  { id:"leste",name:"Zona Leste",revenueCents:6562000,appointments:116,patients:310,conversion:53,occupancy:75,noShows:5,conversations:158,leads:44 },
];
export const reportSeries = [{ label:"Realizado",values:[124,142,151,168,176,187],color:"bg-primary" },{ label:"Previsto",values:[138,151,167,184,207,224],color:"bg-info" }];
