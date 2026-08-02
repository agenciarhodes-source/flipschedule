import type { Appointment, AppointmentStatus, ScheduleBlock } from "./appointments";

export interface ScheduleFilters { query: string; unitId: string; professionalId: string; status: AppointmentStatus | ""; procedureId: string; resource: string; confirmation: "" | "confirmed" | "unconfirmed"; period: "" | "morning" | "afternoon"; }
export const emptyScheduleFilters: ScheduleFilters = { query: "", unitId: "", professionalId: "", status: "", procedureId: "", resource: "", confirmation: "", period: "" };

export function appointmentEnd(appointment: Pick<Appointment, "startsAt" | "durationMinutes">) { return new Date(new Date(appointment.startsAt).getTime() + appointment.durationMinutes * 60_000); }
export function calculateDuration(start: string, end: string) { return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60_000); }
export function filterAppointments(items: Appointment[], filters: ScheduleFilters) {
  const query = filters.query.trim().toLocaleLowerCase("pt-BR");
  return items.filter((item) => {
    const hour = new Date(item.startsAt).getUTCHours();
    return (!query || `${item.patientName} ${item.phone}`.toLocaleLowerCase("pt-BR").includes(query)) &&
      (!filters.unitId || item.unitId === filters.unitId) && (!filters.professionalId || item.professionalId === filters.professionalId) &&
      (!filters.status || item.status === filters.status) && (!filters.procedureId || item.procedureId === filters.procedureId) &&
      (!filters.resource || item.resource === filters.resource) && (!filters.confirmation || item.confirmed === (filters.confirmation === "confirmed")) &&
      (!filters.period || (filters.period === "morning" ? hour < 12 : hour >= 12));
  });
}
export function detectConflict(candidate: Appointment, appointments: Appointment[], blocks: ScheduleBlock[] = []) {
  const start = new Date(candidate.startsAt).getTime(); const end = appointmentEnd(candidate).getTime();
  const conflict = appointments.find((item) => item.id !== candidate.id && !["cancelled", "no_show"].includes(item.status) &&
    (item.professionalId === candidate.professionalId || item.resource === candidate.resource) && start < appointmentEnd(item).getTime() && end > new Date(item.startsAt).getTime());
  if (conflict) return { conflict: true, reason: conflict.professionalId === candidate.professionalId ? "O profissional já possui atendimento neste horário." : "A sala ou recurso já está ocupado." };
  const block = blocks.find((item) => (!item.professionalId || item.professionalId === candidate.professionalId) && (!item.resource || item.resource === candidate.resource) && start < new Date(item.startsAt).getTime() + item.durationMinutes * 60_000 && end > new Date(item.startsAt).getTime());
  if (block) return { conflict: true, reason: `Horário indisponível: ${block.reason}.` };
  if (new Date(candidate.startsAt).getUTCHours() < 8 || end > new Date(candidate.startsAt.slice(0, 11) + "18:00:00.000Z").getTime()) return { conflict: true, reason: "A duração ultrapassa o expediente (8h às 18h)." };
  return { conflict: false, reason: "" };
}
function group(items: Appointment[], key: (item: Appointment) => string) { return items.reduce<Record<string, Appointment[]>>((result, item) => { (result[key(item)] ??= []).push(item); return result; }, {}); }
export function groupByProfessional(items: Appointment[]) { return group(items, (item) => item.professionalId); }
export function groupByDay(items: Appointment[]) { return group(items, (item) => item.startsAt.slice(0, 10)); }
export function calculateAttendance(items: Appointment[]) { const eligible = items.filter((a) => !["scheduled", "cancelled"].includes(a.status)); return eligible.length ? Math.round(eligible.filter((a) => !["no_show", "cancelled"].includes(a.status)).length / eligible.length * 100) : 0; }
export function calculateRevenue(items: Appointment[]) { return items.filter((a) => a.status === "completed").reduce((sum, a) => sum + a.revenueCents, 0); }
export function calculateOccupancy(items: Appointment[], capacityMinutes = 10 * 60) { return Math.min(100, Math.round(items.filter((a) => !["cancelled", "no_show"].includes(a.status)).reduce((sum, a) => sum + a.durationMinutes, 0) / capacityMinutes * 100)); }
export function comparePeriods(current: number, previous: number) { return previous === 0 ? 0 : Math.round((current - previous) / previous * 100); }
