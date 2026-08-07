import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { AppointmentStatus as PrismaAppointmentStatus } from "@/generated/prisma/enums";
import type { ApplicationContext } from "@/domains/application/context";
import type {
  AppointmentReader,
  ClinicReader,
  ListQuery,
  ProfessionalReader,
  ResourceReader,
  WorkingHoursReader,
} from "@/domains/application/readers";
import { scopedClinicIds, canAccessClinic } from "@/domains/application/clinic-access";
import { normalizePage, parseDateRange, type DateRange, type PageResult } from "@/domains/application/query";
import { mapAppointmentStatus, mapResourceKind, toDateOnly, toIso } from "@/domains/application/mappers";
import { getPrismaClient } from "@/lib/db";

function page<T>(items: T[], total: number, offset: number, limit: number): PageResult<T> {
  return { items, page: { offset, limit, total, hasMore: offset + items.length < total } };
}

function clinicIdCondition(context: ApplicationContext) {
  const ids = scopedClinicIds(context);
  return ids === null ? undefined : { in: ids };
}

function requestedClinicAllowed(context: ApplicationContext, clinicId?: string) {
  return !clinicId || canAccessClinic(context, clinicId);
}

const mapClinic = (row: {
  id: string;
  name: string;
  slug: string;
  timezoneOverride: string | null;
  status: string;
}) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  timezone: row.timezoneOverride,
  active: row.status === "ACTIVE",
});

export class ScopedClinicReader implements ClinicReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  async list(query: ListQuery = {}) {
    const { offset, limit } = normalizePage(query);
    const ids = clinicIdCondition(this.context);
    const where = {
      tenantId: this.context.tenantId,
      ...(ids ? { id: ids } : {}),
    };
    const select = {
      id: true,
      name: true,
      slug: true,
      timezoneOverride: true,
      status: true,
    } as const;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.clinic.findMany({
        where,
        select,
        orderBy: [{ name: query.direction ?? "asc" }, { id: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.clinic.count({ where }),
    ]);
    return page(rows.map(mapClinic), total, offset, limit);
  }

  async findById(id: string) {
    if (!canAccessClinic(this.context, id)) return null;
    const row = await this.prisma.clinic.findFirst({
      where: { id, tenantId: this.context.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        timezoneOverride: true,
        status: true,
      },
    });
    return row ? mapClinic(row) : null;
  }
}

type ProfessionalRow = {
  id: string;
  name: string;
  specialty: string;
  registrationNumber: string | null;
  registrationRegion: string | null;
  status: string;
  color: string | null;
  clinics: {
    clinic: {
      id: string;
      name: string;
      slug: string;
      timezoneOverride: string | null;
      status: string;
    };
  }[];
};

function mapProfessional(row: ProfessionalRow) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    registration: [row.registrationNumber, row.registrationRegion].filter(Boolean).join(" · ") || null,
    color: row.color,
    active: row.status === "ACTIVE",
    clinics: row.clinics.map((entry) => mapClinic(entry.clinic)),
  };
}

export class ScopedProfessionalReader implements ProfessionalReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  private select() {
    const ids = clinicIdCondition(this.context);
    return {
      id: true,
      name: true,
      specialty: true,
      registrationNumber: true,
      registrationRegion: true,
      status: true,
      color: true,
      clinics: {
        where: {
          active: true,
          ...(ids ? { clinicId: ids } : {}),
        },
        select: {
          clinic: {
            select: {
              id: true,
              name: true,
              slug: true,
              timezoneOverride: true,
              status: true,
            },
          },
        },
        orderBy: { clinicId: "asc" as const },
      },
    } as const;
  }

  async list(query: ListQuery & { clinicId?: string } = {}) {
    const { offset, limit } = normalizePage(query);
    if (!requestedClinicAllowed(this.context, query.clinicId)) return page([], 0, offset, limit);
    const ids = scopedClinicIds(this.context);
    const clinicIds = query.clinicId ? [query.clinicId] : ids;
    const where = {
      tenantId: this.context.tenantId,
      ...(clinicIds !== null
        ? {
            clinics: {
              some: {
                tenantId: this.context.tenantId,
                clinicId: { in: clinicIds },
                active: true,
              },
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.professional.findMany({
        where,
        select: this.select(),
        orderBy: [{ name: query.direction ?? "asc" }, { id: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.professional.count({ where }),
    ]);
    return page(rows.map(mapProfessional), total, offset, limit);
  }

  async findById(id: string) {
    const ids = scopedClinicIds(this.context);
    const row = await this.prisma.professional.findFirst({
      where: {
        id,
        tenantId: this.context.tenantId,
        ...(ids !== null
          ? {
              clinics: {
                some: { clinicId: { in: ids }, active: true },
              },
            }
          : {}),
      },
      select: this.select(),
    });
    return row ? mapProfessional(row) : null;
  }
}

const mapResource = (row: {
  id: string;
  clinicId: string;
  name: string;
  type: string;
  active: boolean;
  clinic: { name: string };
}) => ({
  id: row.id,
  clinicId: row.clinicId,
  clinicName: row.clinic.name,
  name: row.name,
  kind: mapResourceKind(row.type),
  active: row.active,
});

export class ScopedResourceReader implements ResourceReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  async list(query: ListQuery & { clinicId?: string } = {}) {
    const { offset, limit } = normalizePage(query);
    if (!requestedClinicAllowed(this.context, query.clinicId)) return page([], 0, offset, limit);
    const ids = clinicIdCondition(this.context);
    const where = {
      tenantId: this.context.tenantId,
      ...(query.clinicId ? { clinicId: query.clinicId } : ids ? { clinicId: ids } : {}),
    };
    const select = {
      id: true,
      clinicId: true,
      name: true,
      type: true,
      active: true,
      clinic: { select: { name: true } },
    } as const;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        select,
        orderBy: [{ name: query.direction ?? "asc" }, { id: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.resource.count({ where }),
    ]);
    return page(rows.map(mapResource), total, offset, limit);
  }

  async findById(id: string) {
    const ids = clinicIdCondition(this.context);
    const row = await this.prisma.resource.findFirst({
      where: {
        id,
        tenantId: this.context.tenantId,
        ...(ids ? { clinicId: ids } : {}),
      },
      select: {
        id: true,
        clinicId: true,
        name: true,
        type: true,
        active: true,
        clinic: { select: { name: true } },
      },
    });
    return row ? mapResource(row) : null;
  }
}

export class ScopedWorkingHoursReader implements WorkingHoursReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  async list(query: ListQuery & { professionalId?: string; clinicId?: string; range?: DateRange }) {
    const { offset, limit } = normalizePage(query);
    if (!requestedClinicAllowed(this.context, query.clinicId)) return page([], 0, offset, limit);
    const range = query.range ? parseDateRange(query.range) : null;
    const ids = clinicIdCondition(this.context);
    const where = {
      tenantId: this.context.tenantId,
      ...(query.professionalId ? { professionalId: query.professionalId } : {}),
      ...(query.clinicId ? { clinicId: query.clinicId } : ids ? { clinicId: ids } : {}),
      ...(range
        ? {
            AND: [
              { OR: [{ validFrom: null }, { validFrom: { lt: range.to } }] },
              { OR: [{ validUntil: null }, { validUntil: { gte: range.from } }] },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.workingHours.findMany({
        where,
        select: {
          id: true,
          professionalId: true,
          clinicId: true,
          weekday: true,
          startMinute: true,
          endMinute: true,
          validFrom: true,
          validUntil: true,
          active: true,
        },
        orderBy: [{ weekday: "asc" }, { startMinute: "asc" }, { id: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.workingHours.count({ where }),
    ]);
    return page(
      rows.map((row) => ({
        ...row,
        validFrom: toDateOnly(row.validFrom),
        validUntil: toDateOnly(row.validUntil),
      })),
      total,
      offset,
      limit,
    );
  }
}

const appointmentSelect = {
  id: true,
  clinicId: true,
  patientId: true,
  professionalId: true,
  procedureId: true,
  resourceId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  priceCents: true,
  cancellationReason: true,
  source: true,
  clinic: { select: { name: true } },
  patient: { select: { name: true } },
  professionalClinic: { select: { professional: { select: { name: true } } } },
  procedure: { select: { name: true } },
  resource: { select: { name: true } },
} as const;

type AppointmentRow = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  procedureId: string | null;
  resourceId: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  priceCents: number;
  cancellationReason: string | null;
  source: string | null;
  clinic: { name: string };
  patient: { name: string };
  professionalClinic: { professional: { name: string } };
  procedure: { name: string } | null;
  resource: { name: string } | null;
};

function mapAppointment(row: AppointmentRow) {
  return {
    id: row.id,
    clinicId: row.clinicId,
    clinicName: row.clinic.name,
    professionalId: row.professionalId,
    professionalName: row.professionalClinic.professional.name,
    patientId: row.patientId,
    patientName: row.patient.name,
    procedureId: row.procedureId,
    procedureName: row.procedure?.name ?? null,
    resourceId: row.resourceId,
    resourceName: row.resource?.name ?? null,
    startsAt: toIso(row.startsAt),
    endsAt: toIso(row.endsAt),
    status: mapAppointmentStatus(row.status),
    priceCents: row.priceCents,
    cancellationReason: row.cancellationReason,
    source: row.source,
  };
}

export class ScopedAppointmentReader implements AppointmentReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  async list(
    query: ListQuery & {
      range: DateRange;
      clinicId?: string;
      professionalId?: string;
      status?: import("@/domains/application/view-models").AppointmentStatus;
    },
  ) {
    const { offset, limit } = normalizePage(query);
    if (!requestedClinicAllowed(this.context, query.clinicId)) return page([], 0, offset, limit);
    const range = parseDateRange(query.range);
    const ids = clinicIdCondition(this.context);
    const where = {
      tenantId: this.context.tenantId,
      startsAt: { gte: range.from, lt: range.to },
      ...(query.clinicId ? { clinicId: query.clinicId } : ids ? { clinicId: ids } : {}),
      ...(query.professionalId ? { professionalId: query.professionalId } : {}),
      ...(query.status
        ? { status: query.status.toUpperCase() as PrismaAppointmentStatus }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        select: appointmentSelect,
        orderBy: [{ startsAt: query.direction ?? "asc" }, { id: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return page(rows.map(mapAppointment), total, offset, limit);
  }

  async findById(id: string) {
    const ids = clinicIdCondition(this.context);
    const row = await this.prisma.appointment.findFirst({
      where: {
        id,
        tenantId: this.context.tenantId,
        ...(ids ? { clinicId: ids } : {}),
      },
      select: appointmentSelect,
    });
    return row ? mapAppointment(row) : null;
  }
}
