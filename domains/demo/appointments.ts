export type DemoAppointmentStatus = "confirmed" | "pending" | "completed";
export interface DemoAppointment { id: string; patientName: string; professionalId: string; procedure: string; startsAt: string; endsAt: string; status: DemoAppointmentStatus; }
export const demoWeek = ["2026-09-14T00:00:00.000Z","2026-09-15T00:00:00.000Z","2026-09-16T00:00:00.000Z","2026-09-17T00:00:00.000Z","2026-09-18T00:00:00.000Z"] as const;
export const demoAppointments: readonly DemoAppointment[] = [
 { id: "apt-1", patientName: "Marina Alves", professionalId: "prof-ana", procedure: "Manutenção ortodôntica", startsAt: "2026-09-14T09:00:00.000Z", endsAt: "2026-09-14T09:45:00.000Z", status: "confirmed" },
 { id: "apt-2", patientName: "João Pedro Lima", professionalId: "prof-caio", procedure: "Avaliação de implante", startsAt: "2026-09-15T10:30:00.000Z", endsAt: "2026-09-15T11:15:00.000Z", status: "pending" },
 { id: "apt-3", patientName: "Beatriz Nunes", professionalId: "prof-livia", procedure: "Avaliação inicial", startsAt: "2026-09-16T14:00:00.000Z", endsAt: "2026-09-16T14:45:00.000Z", status: "completed" },
];
