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

export type LeadStageType = "open" | "won" | "lost";
export interface LeadAssigneeView { id: string; name: string }
export interface LeadActivityView { id: string; fromStage: string | null; toStage: string; occurredAt: string; reason: string | null; owner: string | null }
export interface LeadListItem { id: string; name: string; phone: string | null; email: string | null; source: string | null; estimatedValueCents: number; stageId: string; stageName: string; stageType: LeadStageType; clinicId: string | null; clinicName: string | null; assignee: LeadAssigneeView | null; patientId: string | null; createdAt: string; updatedAt: string }
export interface LeadDetails extends LeadListItem { pipelineId: string; pipelineName: string; wonAt: string | null; lostAt: string | null; activities: LeadActivityView[] }
export interface LeadPipelineColumn { id: string; pipelineId: string; name: string; position: number; type: LeadStageType; leads: LeadListItem[] }
export interface LeadSummaryMetrics { total: number; open: number; won: number; lost: number; estimatedValueCents: number }
export interface PatientContactView { phone: string | null; email: string | null }
export interface PatientAddressView { available: false }
export interface PatientAppointmentSummary { id: string; startsAt: string; endsAt: string; status: AppointmentStatus; clinicName: string; professionalName: string; procedureName: string | null; priceCents: number }
export interface PatientTimelineItem { id: string; type: "created" | "appointment" | "lead" | "treatment_plan" | "conversation"; occurredAt: string; title: string; details: string }
export interface PatientDuplicateCandidate { id: string; name: string; matchedBy: "phone" | "email" }
export interface PatientListItem { id: string; name: string; contact: PatientContactView; birthDate: string | null; archived: boolean; createdAt: string; updatedAt: string; nextAppointmentAt: string | null; appointmentCount: number }
export interface PatientDetails extends PatientListItem { address: PatientAddressView; appointments: PatientAppointmentSummary[]; timeline: PatientTimelineItem[]; treatmentPlanCount: number; conversationCount: number; leadIds: string[] }
