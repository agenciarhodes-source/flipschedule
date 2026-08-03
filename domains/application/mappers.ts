import type { AppointmentStatus, ResourceKind } from "./view-models";
const appointmentStatuses: Record<string, AppointmentStatus> = { SCHEDULED: "scheduled", CONFIRMED: "confirmed", ARRIVED: "arrived", ATTENDED: "attended", NO_SHOW: "no_show", CANCELLED: "cancelled", RESCHEDULED: "rescheduled" };
const resourceKinds: Record<string, ResourceKind> = { CHAIR: "chair", ROOM: "room", EQUIPMENT: "equipment", OTHER: "other" };
export function mapAppointmentStatus(value: string): AppointmentStatus { const mapped = appointmentStatuses[value]; if (!mapped) throw new Error(`Unsupported appointment status: ${value}`); return mapped; }
export function mapResourceKind(value: string): ResourceKind { const mapped = resourceKinds[value]; if (!mapped) throw new Error(`Unsupported resource type: ${value}`); return mapped; }
export function toIso(value: Date | string) { const date = value instanceof Date ? value : new Date(value); if (!Number.isFinite(date.getTime())) throw new Error("Invalid date received from data adapter"); return date.toISOString(); }
export function toDateOnly(value: Date | string | null) { return value === null ? null : toIso(value).slice(0, 10); }

