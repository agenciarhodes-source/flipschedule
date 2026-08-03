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

export type TreatmentPlanStatus = "draft"|"sent"|"viewed"|"accepted"|"rejected"|"expired"|"cancelled";
export interface TreatmentPlanItemView { id:string; procedureId:string|null; procedureName:string|null; description:string; quantity:number; unitPriceCents:number; discountCents:number; totalCents:number; position:number }
export interface TreatmentPlanStatusHistoryView { id:string; fromStatus:TreatmentPlanStatus|null; toStatus:TreatmentPlanStatus; changedAt:string; reason:string|null }
export interface TreatmentPlanListItem { id:string; title:string; status:TreatmentPlanStatus; patientId:string; patientName:string; professionalId:string|null; professionalName:string|null; clinicId:string|null; clinicName:string|null; leadId:string|null; subtotalCents:number; discountCents:number; totalCents:number; expiresAt:string|null; updatedAt:string }
export interface TreatmentPlanDetails extends TreatmentPlanListItem { items:TreatmentPlanItemView[]; history:TreatmentPlanStatusHistoryView[]; sentAt:string|null; acceptedAt:string|null; rejectedAt:string|null; createdAt:string }
export interface TreatmentPlanSummaryMetrics { total:number; openValueCents:number; acceptedValueCents:number; expiringSoon:number }
export interface PublicTreatmentPlanView { title:string; status:TreatmentPlanStatus; patientFirstName:string; clinicName:string|null; items:TreatmentPlanItemView[]; subtotalCents:number; discountCents:number; totalCents:number; expiresAt:string|null }
export interface PublicTreatmentPlanLinkResult { url:string; expiresAt:string }

export type ConversationChannel = "whatsapp"|"instagram"|"messenger"|"email"|"internal";
export type ConversationStatus = "open"|"pending"|"closed"|"archived";
export interface ConversationContactView { kind:"patient"|"lead"|"unlinked"; id:string|null; name:string }
export interface MessageView { id:string; direction:"inbound"|"outbound"|"internal"; status:"pending"|"sent"|"delivered"|"read"|"failed"|"received"; contentType:string; preview:string|null; createdAt:string; readAt:string|null }
export interface ConversationListItem { id:string; channel:ConversationChannel; status:ConversationStatus; contact:ConversationContactView; integrationId:string|null; lastMessageAt:string|null; unreadCount:number; preview:string|null }
export interface ConversationDetails extends ConversationListItem { patientId:string|null; leadId:string|null; messages:MessageView[]; messagePage:{hasMore:boolean; nextCursor:string|null} }
export interface ConversationSummaryMetrics { total:number; open:number; pending:number; unread:number }
export interface UnreadConversationSummary { conversations:number; messages:number }

export interface ReportBreakdown { id:string; name:string; appointments:number; attended:number; noShows:number; revenueCents:number; acceptedPlans:number; acceptedValueCents:number }
export interface ReportPeriod { from:string; to:string }
export interface ReportSnapshot { period:ReportPeriod; previousPeriod:ReportPeriod; appointments:number; attended:number; noShows:number; newPatients:number; leads:number; wonLeads:number; treatmentPlans:number; acceptedPlans:number; proposedValueCents:number; acceptedValueCents:number; conversations:number; unreadMessages:number; consentPatients:number; revokedConsents:number; clinics:ReportBreakdown[]; professionals:ReportBreakdown[]; previous:{appointments:number;attended:number;newPatients:number;wonLeads:number;acceptedPlans:number;acceptedValueCents:number} }
export interface OrganizationSettingsView { name:string; slug:string; timezone:string; locale:string; integrations:{provider:string;status:string;connectedAt:string|null}[]; subscription:{planCode:string;status:string;currentPeriodEnd:string|null;cancelAtPeriodEnd:boolean}|null }
