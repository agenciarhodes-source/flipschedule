import type { DateRange, PageRequest, PageResult, SortDirection } from "./query";
import type { AppointmentDetails, AppointmentStatus, AppointmentSummary, ClinicSummary, ProcedureSummary, ProfessionalSummary, ResourceSummary, WorkingHoursSummary } from "./view-models";
import type { LeadAssigneeView, LeadDetails, LeadListItem, LeadPipelineColumn, LeadSummaryMetrics, PatientDetails, PatientDuplicateCandidate, PatientListItem } from "./view-models";
export interface ListQuery extends PageRequest { direction?: SortDirection }
export interface ClinicReader { list(query?: ListQuery): Promise<PageResult<ClinicSummary>>; findById(id: string): Promise<ClinicSummary | null> }
export interface ProfessionalReader { list(query?: ListQuery & { clinicId?: string }): Promise<PageResult<ProfessionalSummary>>; findById(id: string): Promise<ProfessionalSummary | null> }
export interface ProcedureReader { list(query?: ListQuery & { active?: boolean }): Promise<PageResult<ProcedureSummary>>; findById(id: string): Promise<ProcedureSummary | null> }
export interface ResourceReader { list(query?: ListQuery & { clinicId?: string }): Promise<PageResult<ResourceSummary>>; findById(id: string): Promise<ResourceSummary | null> }
export interface WorkingHoursReader { list(query: ListQuery & { professionalId?: string; clinicId?: string; range?: DateRange }): Promise<PageResult<WorkingHoursSummary>> }
export interface AppointmentReader { list(query: ListQuery & { range: DateRange; clinicId?: string; professionalId?: string; status?: AppointmentStatus }): Promise<PageResult<AppointmentSummary>>; findById(id: string): Promise<AppointmentDetails | null> }
export interface LeadReader { list(query?: ListQuery & { search?: string; stageId?: string; assigneeId?: string; clinicId?: string; source?: string; range?: DateRange }): Promise<PageResult<LeadListItem>>; findById(id: string): Promise<LeadDetails | null>; pipeline(): Promise<LeadPipelineColumn[]>; assignees(): Promise<LeadAssigneeView[]>; metrics(): Promise<LeadSummaryMetrics> }
export interface PatientReader { list(query?: ListQuery & { search?: string; archived?: boolean }): Promise<PageResult<PatientListItem>>; findById(id: string): Promise<PatientDetails | null>; duplicates(input: { phone?: string; email?: string; excludeId?: string }): Promise<PatientDuplicateCandidate[]> }
