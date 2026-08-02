import type { LucideIcon } from "lucide-react";
import { CalendarCheck, Clock3, DollarSign, Receipt, Target, UserPlus, Users, WalletCards } from "lucide-react";

export type DashboardPeriod = "today" | "7d" | "30d" | "month" | "custom";
export interface DashboardMetric { id: string; label: string; value: number; format: "currency" | "percentage" | "number" | "minutes"; delta: number; context: string; icon: LucideIcon; }
export interface OperationalAlert { id: string; level: "info" | "warning" | "critical"; title: string; description: string; action: string; }
export const dashboardPeriodLabels: Record<DashboardPeriod, string> = { today: "Hoje", "7d": "Últimos 7 dias", "30d": "Últimos 30 dias", month: "Este mês", custom: "Período personalizado" };
const multipliers: Record<DashboardPeriod, number> = { today: .08, "7d": .35, "30d": 1, month: 1.12, custom: .72 };
export function getDashboardMetrics(period: DashboardPeriod, unitId: string): DashboardMetric[] {
  const m = multipliers[period] * (unitId === "leste" ? .62 : unitId === "centro" ? 1 : 1.62);
  return [
    { id: "revenue", label: "Receita realizada", value: Math.round(18742000*m), format: "currency", delta: 12, context: "Procedimentos finalizados", icon: DollarSign },
    { id: "forecast", label: "Receita prevista", value: Math.round(23680000*m), format: "currency", delta: 8, context: "Agenda confirmada", icon: WalletCards },
    { id: "appointments", label: "Agendamentos", value: Math.round(164*m), format: "number", delta: 5, context: "No período selecionado", icon: CalendarCheck },
    { id: "attendance", label: "Comparecimento", value: unitId === "leste" ? 88 : 92, format: "percentage", delta: 3, context: "Exclui cancelamentos", icon: Users },
    { id: "patients", label: "Novos pacientes", value: Math.round(24*m), format: "number", delta: 9, context: "Primeira consulta", icon: UserPlus },
    { id: "conversion", label: "Conversão de orçamentos", value: 58, format: "percentage", delta: -2, context: "Aceites sobre propostas", icon: Target },
    { id: "ticket", label: "Ticket médio", value: 114280, format: "currency", delta: 4, context: "Por atendimento pago", icon: Receipt },
    { id: "response", label: "Tempo de resposta", value: 7, format: "minutes", delta: 0, context: "Média do atendimento", icon: Clock3 },
  ];
}
export const financialSeries = [
  { label: "Seg", realized: 42, forecast: 55 }, { label: "Ter", realized: 55, forecast: 61 }, { label: "Qua", realized: 48, forecast: 67 },
  { label: "Qui", realized: 72, forecast: 78 }, { label: "Sex", realized: 68, forecast: 84 }, { label: "Sáb", realized: 86, forecast: 92 }, { label: "Dom", realized: 64, forecast: 73 },
];
export const operationalAlerts: OperationalAlert[] = [
  { id: "idle", level: "info", title: "Horários ociosos", description: "Há 6 horários livres nas próximas 48 horas.", action: "Ver agenda" },
  { id: "confirmation", level: "warning", title: "Pacientes sem confirmação", description: "8 pacientes ainda não confirmaram presença.", action: "Revisar" },
  { id: "plans", level: "warning", title: "Orçamentos próximos do vencimento", description: "5 propostas vencem nesta semana.", action: "Ver orçamentos" },
  { id: "messages", level: "critical", title: "Mensagens sem resposta", description: "3 conversas aguardam há mais de 30 minutos.", action: "Abrir inbox" },
  { id: "capacity", level: "critical", title: "Agenda sobrecarregada", description: "Dra. Mariana está com 96% da capacidade ocupada.", action: "Redistribuir" },
];
export const funnel = [{ label: "Novos leads", count: 82, value: 12800000 }, { label: "Contatos", count: 64, value: 9600000 }, { label: "Avaliações", count: 46, value: 7800000 }, { label: "Propostas", count: 31, value: 6200000 }, { label: "Fechamentos", count: 18, value: 4100000 }];
export const recentActivities = ["Agendamento criado para Renata Martins", "Marina Alves confirmou presença", "Orçamento de João Pedro foi aceito", "Lead de Sofia Mendes foi atualizado", "Nova mensagem recebida no Inbox", "Pagamento de R$ 1.200 registrado"];
