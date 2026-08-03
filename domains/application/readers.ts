import type { DateRange, PageRequest, PageResult, SortDirection } from "./query";
import type { AppointmentDetails, AppointmentStatus, AppointmentSummary, ClinicSummary, ProcedureSummary, ProfessionalSummary, ResourceSummary, WorkingHoursSummary } from "./view-models";
export interface ListQuery extends PageRequest { direction?: SortDirection }
export interface ClinicReader { list(query?: ListQuery): Promise<PageResult<ClinicSummary>>; findById(id: string): Promise<ClinicSummary | null> }
export interface ProfessionalReader { list(query?: ListQuery & { clinicId?: string }): Promise<PageResult<ProfessionalSummary>>; findById(id: string): Promise<ProfessionalSummary | null> }
export interface ProcedureReader { list(query?: ListQuery & { active?: boolean }): Promise<PageResult<ProcedureSummary>>; findById(id: string): Promise<ProcedureSummary | null> }
export interface ResourceReader { list(query?: ListQuery & { clinicId?: string }): Promise<PageResult<ResourceSummary>>; findById(id: string): Promise<ResourceSummary | null> }
export interface WorkingHoursReader { list(query: ListQuery & { professionalId?: string; clinicId?: string; range?: DateRange }): Promise<PageResult<WorkingHoursSummary>> }
export interface AppointmentReader { list(query: ListQuery & { range: DateRange; clinicId?: string; professionalId?: string; status?: AppointmentStatus }): Promise<PageResult<AppointmentSummary>>; findById(id: string): Promise<AppointmentDetails | null> }

