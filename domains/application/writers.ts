import type { ActionResult } from "./actions";
import type { AppointmentStatus } from "./view-models";

export interface EntityWriter<T> { create(input: unknown): Promise<ActionResult<T>>; update(id: string, input: unknown): Promise<ActionResult<T>> }
export interface WorkingHoursWriter { replace(input: unknown): Promise<ActionResult<{ count: number }>> }
export interface ScheduleBlockWriter { create(input: unknown): Promise<ActionResult<{ id: string }>>; remove(id: string): Promise<ActionResult<{ id: string }>> }
export interface QuickPatientWriter { create(input: unknown): Promise<ActionResult<{ id: string; name: string }>> }
export interface AppointmentWriter {
  create(input: unknown): Promise<ActionResult<{ id: string }>>;
  reschedule(id: string, input: unknown): Promise<ActionResult<{ id: string }>>;
  transition(id: string, status: AppointmentStatus, reason?: string): Promise<ActionResult<{ id: string; status: AppointmentStatus }>>;
  history(id: string): Promise<ActionResult<Array<{ fromStatus: AppointmentStatus | null; toStatus: AppointmentStatus; changedAt: string; reason: string | null }>>>;
}
