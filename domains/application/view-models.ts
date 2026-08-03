export interface TenantSummary { id: string; name: string; slug: string; timezone: string }
export interface ClinicSummary { id: string; name: string; slug: string; timezone: string | null; active: boolean }
export interface ProfessionalSummary { id: string; name: string; specialty: string; registration: string | null; color: string | null; active: boolean; clinics: ClinicSummary[] }
export interface ProcedureSummary { id: string; name: string; category: string | null; durationMinutes: number; priceCents: number; active: boolean; professionals: Pick<ProfessionalSummary, "id" | "name">[] }
export type ResourceKind = "chair" | "room" | "equipment" | "other";
export interface ResourceSummary { id: string; clinicId: string; clinicName: string; name: string; kind: ResourceKind; active: boolean }
export interface WorkingHoursSummary { id: string; professionalId: string; clinicId: string; weekday: number; startMinute: number; endMinute: number; validFrom: string | null; validUntil: string | null; active: boolean }
export type AppointmentStatus = "scheduled" | "confirmed" | "arrived" | "attended" | "no_show" | "cancelled" | "rescheduled";
export interface AppointmentSummary { id: string; clinicId: string; clinicName: string; professionalId: string; professionalName: string; patientId: string; patientName: string; procedureId: string | null; procedureName: string | null; resourceId: string | null; resourceName: string | null; startsAt: string; endsAt: string; status: AppointmentStatus; priceCents: number }
export interface AppointmentDetails extends AppointmentSummary { cancellationReason: string | null; source: string | null }

