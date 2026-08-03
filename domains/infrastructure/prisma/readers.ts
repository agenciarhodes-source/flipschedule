import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { AppointmentStatus as PrismaAppointmentStatus } from "@/generated/prisma/enums";
import type { ApplicationContext } from "@/domains/application/context";
import type { AppointmentReader, ClinicReader, ListQuery, ProfessionalReader, ProcedureReader, ResourceReader, WorkingHoursReader } from "@/domains/application/readers";
import { normalizePage, parseDateRange, type DateRange, type PageResult } from "@/domains/application/query";
import { mapAppointmentStatus, mapResourceKind, toDateOnly, toIso } from "@/domains/application/mappers";
import { getPrismaClient } from "@/lib/db";

function page<T>(items: T[], total: number, offset: number, limit: number): PageResult<T> { return { items, page: { offset, limit, total, hasMore: offset + items.length < total } }; }

abstract class TenantPrismaReader {
  protected readonly prisma: PrismaClient;
  protected constructor(protected readonly context: ApplicationContext, prisma?: PrismaClient) { this.prisma = prisma ?? getPrismaClient(); }
}

export class PrismaClinicReader extends TenantPrismaReader implements ClinicReader {
  constructor(context: ApplicationContext, prisma?: PrismaClient) { super(context, prisma); }
  async list(query: ListQuery = {}) { const { offset, limit } = normalizePage(query); const where = { tenantId: this.context.tenantId }; const [rows, total] = await this.prisma.$transaction([this.prisma.clinic.findMany({ where, select: { id: true, name: true, slug: true, timezoneOverride: true, status: true }, orderBy: [{ name: query.direction ?? "asc" }, { id: "asc" }], skip: offset, take: limit }), this.prisma.clinic.count({ where })]); return page(rows.map(mapClinic), total, offset, limit); }
  async findById(id: string) { const row = await this.prisma.clinic.findFirst({ where: { id, tenantId: this.context.tenantId }, select: { id: true, name: true, slug: true, timezoneOverride: true, status: true } }); return row ? mapClinic(row) : null; }
}
const mapClinic = (row: { id: string; name: string; slug: string; timezoneOverride: string | null; status: string }) => ({ id: row.id, name: row.name, slug: row.slug, timezone: row.timezoneOverride, active: row.status === "ACTIVE" });

const professionalSelect = { id: true, name: true, specialty: true, registrationNumber: true, registrationRegion: true, status: true, color: true, clinics: { where: { active: true }, select: { clinic: { select: { id: true, name: true, slug: true, timezoneOverride: true, status: true } } }, orderBy: { clinicId: "asc" as const } } };
export class PrismaProfessionalReader extends TenantPrismaReader implements ProfessionalReader {
  constructor(context: ApplicationContext, prisma?: PrismaClient) { super(context, prisma); }
  async list(query: ListQuery & { clinicId?: string } = {}) { const { offset, limit } = normalizePage(query); const where = { tenantId: this.context.tenantId, ...(query.clinicId ? { clinics: { some: { tenantId: this.context.tenantId, clinicId: query.clinicId, active: true } } } : {}) }; const [rows, total] = await this.prisma.$transaction([this.prisma.professional.findMany({ where, select: professionalSelect, orderBy: [{ name: query.direction ?? "asc" }, { id: "asc" }], skip: offset, take: limit }), this.prisma.professional.count({ where })]); return page(rows.map(mapProfessional), total, offset, limit); }
  async findById(id: string) { const row = await this.prisma.professional.findFirst({ where: { id, tenantId: this.context.tenantId }, select: professionalSelect }); return row ? mapProfessional(row) : null; }
}
type ProfessionalRow = { id: string; name: string; specialty: string; registrationNumber: string | null; registrationRegion: string | null; status: string; color: string | null; clinics: { clinic: Parameters<typeof mapClinic>[0] }[] };
function mapProfessional(row: ProfessionalRow) { return { id: row.id, name: row.name, specialty: row.specialty, registration: [row.registrationNumber, row.registrationRegion].filter(Boolean).join(" · ") || null, color: row.color, active: row.status === "ACTIVE", clinics: row.clinics.map((entry) => mapClinic(entry.clinic)) }; }

export class PrismaProcedureReader extends TenantPrismaReader implements ProcedureReader {
  constructor(context: ApplicationContext, prisma?: PrismaClient) { super(context, prisma); }
  async list(query: ListQuery & { active?: boolean } = {}) { const { offset, limit } = normalizePage(query); const where = { tenantId: this.context.tenantId, ...(query.active === undefined ? {} : { active: query.active }) }; const select = { id: true, name: true, category: true, durationMinutes: true, defaultPriceCents: true, active: true }; const [rows, total] = await this.prisma.$transaction([this.prisma.procedure.findMany({ where, select, orderBy: [{ name: query.direction ?? "asc" }, { id: "asc" }], skip: offset, take: limit }), this.prisma.procedure.count({ where })]); return page(rows.map(mapProcedure), total, offset, limit); }
  async findById(id: string) { const row = await this.prisma.procedure.findFirst({ where: { id, tenantId: this.context.tenantId }, select: { id: true, name: true, category: true, durationMinutes: true, defaultPriceCents: true, active: true } }); return row ? mapProcedure(row) : null; }
}
const mapProcedure = (row: { id: string; name: string; category: string | null; durationMinutes: number; defaultPriceCents: number; active: boolean }) => ({ id: row.id, name: row.name, category: row.category, durationMinutes: row.durationMinutes, priceCents: row.defaultPriceCents, active: row.active, professionals: [] });

export class PrismaResourceReader extends TenantPrismaReader implements ResourceReader {
  constructor(context: ApplicationContext, prisma?: PrismaClient) { super(context, prisma); }
  async list(query: ListQuery & { clinicId?: string } = {}) { const { offset, limit } = normalizePage(query); const where = { tenantId: this.context.tenantId, ...(query.clinicId ? { clinicId: query.clinicId } : {}) }; const select = { id: true, clinicId: true, name: true, type: true, active: true, clinic: { select: { name: true } } }; const [rows, total] = await this.prisma.$transaction([this.prisma.resource.findMany({ where, select, orderBy: [{ name: query.direction ?? "asc" }, { id: "asc" }], skip: offset, take: limit }), this.prisma.resource.count({ where })]); return page(rows.map(mapResource), total, offset, limit); }
  async findById(id: string) { const row = await this.prisma.resource.findFirst({ where: { id, tenantId: this.context.tenantId }, select: { id: true, clinicId: true, name: true, type: true, active: true, clinic: { select: { name: true } } } }); return row ? mapResource(row) : null; }
}
const mapResource = (row: { id: string; clinicId: string; name: string; type: string; active: boolean; clinic: { name: string } }) => ({ id: row.id, clinicId: row.clinicId, clinicName: row.clinic.name, name: row.name, kind: mapResourceKind(row.type), active: row.active });

export class PrismaWorkingHoursReader extends TenantPrismaReader implements WorkingHoursReader {
  constructor(context: ApplicationContext, prisma?: PrismaClient) { super(context, prisma); }
  async list(query: ListQuery & { professionalId?: string; clinicId?: string; range?: DateRange }) { const { offset, limit } = normalizePage(query); const range = query.range ? parseDateRange(query.range) : null; const where = { tenantId: this.context.tenantId, ...(query.professionalId ? { professionalId: query.professionalId } : {}), ...(query.clinicId ? { clinicId: query.clinicId } : {}), ...(range ? { AND: [{ OR: [{ validFrom: null }, { validFrom: { lt: range.to } }] }, { OR: [{ validUntil: null }, { validUntil: { gte: range.from } }] }] } : {}) }; const [rows, total] = await this.prisma.$transaction([this.prisma.workingHours.findMany({ where, select: { id: true, professionalId: true, clinicId: true, weekday: true, startMinute: true, endMinute: true, validFrom: true, validUntil: true, active: true }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }, { id: "asc" }], skip: offset, take: limit }), this.prisma.workingHours.count({ where })]); return page(rows.map((r) => ({ ...r, validFrom: toDateOnly(r.validFrom), validUntil: toDateOnly(r.validUntil) })), total, offset, limit); }
}

const appointmentSelect = { id: true, clinicId: true, patientId: true, professionalId: true, procedureId: true, resourceId: true, startsAt: true, endsAt: true, status: true, priceCents: true, cancellationReason: true, source: true, clinic: { select: { name: true } }, patient: { select: { name: true } }, professionalClinic: { select: { professional: { select: { name: true } } } }, procedure: { select: { name: true } }, resource: { select: { name: true } } };
export class PrismaAppointmentReader extends TenantPrismaReader implements AppointmentReader {
  constructor(context: ApplicationContext, prisma?: PrismaClient) { super(context, prisma); }
  async list(query: ListQuery & { range: DateRange; clinicId?: string; professionalId?: string; status?: import("@/domains/application/view-models").AppointmentStatus }) { const { offset, limit } = normalizePage(query); const range = parseDateRange(query.range); const where = { tenantId: this.context.tenantId, startsAt: { gte: range.from, lt: range.to }, ...(query.clinicId ? { clinicId: query.clinicId } : {}), ...(query.professionalId ? { professionalId: query.professionalId } : {}), ...(query.status ? { status: query.status.toUpperCase() as PrismaAppointmentStatus } : {}) }; const [rows, total] = await this.prisma.$transaction([this.prisma.appointment.findMany({ where, select: appointmentSelect, orderBy: [{ startsAt: query.direction ?? "asc" }, { id: "asc" }], skip: offset, take: limit }), this.prisma.appointment.count({ where })]); return page(rows.map(mapAppointment), total, offset, limit); }
  async findById(id: string) { const row = await this.prisma.appointment.findFirst({ where: { id, tenantId: this.context.tenantId }, select: appointmentSelect }); return row ? mapAppointment(row) : null; }
}
type AppointmentRow = { id: string; clinicId: string; patientId: string; professionalId: string; procedureId: string | null; resourceId: string | null; startsAt: Date; endsAt: Date; status: string; priceCents: number; cancellationReason: string | null; source: string | null; clinic: { name: string }; patient: { name: string }; professionalClinic: { professional: { name: string } }; procedure: { name: string } | null; resource: { name: string } | null };
function mapAppointment(row: AppointmentRow) { return { id: row.id, clinicId: row.clinicId, clinicName: row.clinic.name, professionalId: row.professionalId, professionalName: row.professionalClinic.professional.name, patientId: row.patientId, patientName: row.patient.name, procedureId: row.procedureId, procedureName: row.procedure?.name ?? null, resourceId: row.resourceId, resourceName: row.resource?.name ?? null, startsAt: toIso(row.startsAt), endsAt: toIso(row.endsAt), status: mapAppointmentStatus(row.status), priceCents: row.priceCents, cancellationReason: row.cancellationReason, source: row.source }; }
