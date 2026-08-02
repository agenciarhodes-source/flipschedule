export type AppointmentStatus = "scheduled" | "confirmed" | "waiting" | "in_service" | "completed" | "no_show" | "cancelled";
export type DemoAppointmentStatus = AppointmentStatus;

export interface ClinicUnit { id: string; name: "Centro" | "Zona Leste"; }
export interface Professional { id: string; name: string; specialty: string; color: string; unitIds: string[]; }
export interface Procedure { id: string; name: string; durationMinutes: number; priceCents: number; }
export interface Appointment {
  id: string; patientName: string; phone: string; professionalId: string; procedureId: string;
  unitId: string; resource: string; startsAt: string; durationMinutes: number; status: AppointmentStatus;
  confirmed: boolean; origin: string; notes?: string | undefined; recurring?: boolean | undefined; revenueCents: number;
}
export type DemoAppointment = Appointment;
export interface ScheduleBlock { id: string; professionalId?: string; resource?: string; startsAt: string; durationMinutes: number; reason: string; }

export const clinicUnits: ClinicUnit[] = [{ id: "centro", name: "Centro" }, { id: "leste", name: "Zona Leste" }];
export const scheduleProfessionals: Professional[] = [
  { id: "prof-ana", name: "Dra. Mariana Costa", specialty: "Ortodontia", color: "hsl(var(--accent))", unitIds: ["centro", "leste"] },
  { id: "prof-caio", name: "Dr. Rafael Lima", specialty: "Implantodontia", color: "hsl(var(--info))", unitIds: ["centro"] },
  { id: "prof-livia", name: "Dra. Camila Rocha", specialty: "Clínica geral", color: "hsl(var(--warm))", unitIds: ["centro", "leste"] },
];
export const scheduleProcedures: Procedure[] = [
  { id: "evaluation", name: "Avaliação inicial", durationMinutes: 45, priceCents: 18000 },
  { id: "orthodontics", name: "Manutenção ortodôntica", durationMinutes: 30, priceCents: 24000 },
  { id: "whitening", name: "Clareamento", durationMinutes: 60, priceCents: 120000 },
  { id: "implant", name: "Implante unitário", durationMinutes: 90, priceCents: 380000 },
  { id: "return", name: "Retorno", durationMinutes: 30, priceCents: 0 },
];

const patients = ["Marina Alves", "João Pedro Lima", "Beatriz Nunes", "Renata Martins", "Carlos Eduardo", "Lívia Moreira", "Paulo Reis", "Sofia Mendes", "André Castro", "Nina Barros"];
const statuses: AppointmentStatus[] = ["confirmed", "scheduled", "completed", "waiting", "in_service", "no_show", "cancelled"];
const days = [14, 15, 16, 17, 18, 19];
export const demoAppointments: Appointment[] = Array.from({ length: 30 }, (_, index) => {
  const procedure = scheduleProcedures[index % scheduleProcedures.length]!;
  const day = days[index % days.length];
  const hour = 8 + ((index * 2) % 10);
  return {
    id: `apt-${index + 1}`, patientName: patients[index % patients.length]!, phone: `+5586999****${String(20 + index).slice(-2)}`,
    professionalId: scheduleProfessionals[index % 3]!.id, procedureId: procedure.id, unitId: index % 3 === 0 ? "leste" : "centro",
    resource: index % 2 ? "Consultório 1" : "Sala de procedimentos", startsAt: `2026-09-${day}T${String(hour).padStart(2, "0")}:${index % 2 ? "30" : "00"}:00.000Z`,
    durationMinutes: procedure.durationMinutes, status: statuses[index % statuses.length]!, confirmed: index % 3 !== 1,
    origin: ["WhatsApp", "Indicação", "Instagram", "Google"][index % 4]!, notes: index % 6 === 0 ? "Paciente relatou sensibilidade; acolher antes do atendimento." : undefined,
    recurring: index % 7 === 0, revenueCents: procedure.priceCents,
  };
});
// Caso intencional de sobreposição para demonstrar alertas de conflito.
demoAppointments[10] = { ...demoAppointments[10]!, professionalId: demoAppointments[4]!.professionalId, startsAt: demoAppointments[4]!.startsAt, resource: demoAppointments[4]!.resource };

export const scheduleBlocks: ScheduleBlock[] = [
  { id: "block-1", professionalId: "prof-ana", startsAt: "2026-09-16T12:00:00.000Z", durationMinutes: 60, reason: "Intervalo" },
  { id: "block-2", resource: "Sala de procedimentos", startsAt: "2026-09-17T15:00:00.000Z", durationMinutes: 90, reason: "Manutenção do equipamento" },
];
export const demoWeek = ["2026-09-14T00:00:00.000Z", "2026-09-15T00:00:00.000Z", "2026-09-16T00:00:00.000Z", "2026-09-17T00:00:00.000Z", "2026-09-18T00:00:00.000Z"] as const;
