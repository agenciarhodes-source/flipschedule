import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import type { LeadReader, PatientReader } from "@/domains/application/readers";
import { scopedClinicIds, canAccessClinic } from "@/domains/application/clinic-access";
import { normalizePage, parseDateRange } from "@/domains/application/query";
import { mapAppointmentStatus, toDateOnly, toIso } from "@/domains/application/mappers";
import type {
  LeadListItem,
  LeadStageType,
  PatientDetails,
  PatientTimelineItem,
} from "@/domains/application/view-models";
import { getPrismaClient } from "@/lib/db";

const stageType = (value: string) => value.toLowerCase() as LeadStageType;
const page = <T,>(items: T[], total: number, offset: number, limit: number) => ({
  items,
  page: { offset, limit, total, hasMore: offset + items.length < total },
});

const leadSelect = {
  id: true,
  name: true,
  phoneE164: true,
  emailNormalized: true,
  source: true,
  estimatedValueCents: true,
  patientId: true,
  pipelineId: true,
  clinicId: true,
  stageId: true,
  createdAt: true,
  updatedAt: true,
  wonAt: true,
  lostAt: true,
  stage: { select: { name: true, type: true } },
  pipeline: { select: { name: true } },
  clinic: { select: { name: true } },
  assignedMembership: { select: { id: true, user: { select: { displayName: true } } } },
} as const;

type LeadRow = {
  id: string;
  name: string;
  phoneE164: string | null;
  emailNormalized: string | null;
  source: string | null;
  estimatedValueCents: number;
  patientId: string | null;
  pipelineId: string;
  clinicId: string | null;
  stageId: string;
  createdAt: Date;
  updatedAt: Date;
  wonAt: Date | null;
  lostAt: Date | null;
  stage: { name: string; type: string };
  pipeline: { name: string };
  clinic: { name: string } | null;
  assignedMembership: { id: string; user: { displayName: string } } | null;
};

function mapLead(row: LeadRow): LeadListItem {
  return {
    id: row.id,
    name: row.name,
    phone: row.phoneE164,
    email: row.emailNormalized,
    source: row.source,
    estimatedValueCents: row.estimatedValueCents,
    stageId: row.stageId,
    stageName: row.stage.name,
    stageType: stageType(row.stage.type),
    clinicId: row.clinicId,
    clinicName: row.clinic?.name ?? null,
    assignee: row.assignedMembership
      ? { id: row.assignedMembership.id, name: row.assignedMembership.user.displayName }
      : null,
    patientId: row.patientId,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function clinicFilter(context: ApplicationContext, requested?: string) {
  if (requested && !canAccessClinic(context, requested)) return { impossible: true as const };
  const ids = scopedClinicIds(context);
  if (requested) return { clinicId: requested };
  if (ids !== null) return { clinicId: { in: ids } };
  return {};
}

export class ScopedLeadReader implements LeadReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  async list(query: Parameters<LeadReader["list"]>[0] = {}) {
    const { offset, limit } = normalizePage(query);
    const range = query.range ? parseDateRange(query.range) : null;
    const scope = clinicFilter(this.context, query.clinicId);
    if ("impossible" in scope) return page([], 0, offset, limit);
    const where = {
      tenantId: this.context.tenantId,
      archivedAt: null,
      ...scope,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { phoneE164: { contains: query.search } },
              { emailNormalized: { contains: query.search.toLowerCase(), mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(query.stageId ? { stageId: query.stageId } : {}),
      ...(query.assigneeId ? { assignedMembershipId: query.assigneeId } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(range ? { createdAt: { gte: range.from, lt: range.to } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        select: leadSelect,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return page(rows.map(mapLead), total, offset, limit);
  }

  async findById(id: string) {
    const scope = clinicFilter(this.context);
    const row = await this.prisma.lead.findFirst({
      where: { id, tenantId: this.context.tenantId, ...("impossible" in scope ? { id: "__denied__" } : scope) },
      select: {
        ...leadSelect,
        stageHistory: {
          select: {
            id: true,
            changedAt: true,
            reason: true,
            fromStage: { select: { name: true } },
            toStage: { select: { name: true } },
            changedBy: { select: { user: { select: { displayName: true } } } },
          },
          orderBy: [{ changedAt: "desc" }, { id: "desc" }],
        },
      },
    });
    return row
      ? {
          ...mapLead(row),
          pipelineId: row.pipelineId,
          pipelineName: row.pipeline.name,
          wonAt: row.wonAt ? toIso(row.wonAt) : null,
          lostAt: row.lostAt ? toIso(row.lostAt) : null,
          activities: row.stageHistory.map((item) => ({
            id: item.id,
            fromStage: item.fromStage?.name ?? null,
            toStage: item.toStage.name,
            occurredAt: toIso(item.changedAt),
            reason: item.reason,
            owner: item.changedBy?.user.displayName ?? null,
          })),
        }
      : null;
  }

  async pipeline() {
    const ids = scopedClinicIds(this.context);
    const currentLeadWhere = {
      tenantId: this.context.tenantId,
      archivedAt: null,
      ...(ids !== null ? { clinicId: { in: ids } } : {}),
    };
    const stages = await this.prisma.pipelineStage.findMany({
      where: { tenantId: this.context.tenantId, active: true, pipeline: { active: true } },
      select: {
        id: true,
        pipelineId: true,
        name: true,
        position: true,
        type: true,
        currentLeads: {
          where: currentLeadWhere,
          select: leadSelect,
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          take: 100,
        },
      },
      orderBy: [{ pipelineId: "asc" }, { position: "asc" }, { id: "asc" }],
    });
    return stages.map((stage) => ({
      id: stage.id,
      pipelineId: stage.pipelineId,
      name: stage.name,
      position: stage.position,
      type: stageType(stage.type),
      leads: stage.currentLeads.map(mapLead),
    }));
  }

  async assignees() {
    const rows = await this.prisma.membership.findMany({
      where: { tenantId: this.context.tenantId, status: "ACTIVE" },
      select: { id: true, user: { select: { displayName: true } } },
      orderBy: [{ user: { displayName: "asc" } }, { id: "asc" }],
      take: 100,
    });
    return rows.map((row) => ({ id: row.id, name: row.user.displayName }));
  }

  async metrics() {
    const ids = scopedClinicIds(this.context);
    const rows = await this.prisma.lead.findMany({
      where: {
        tenantId: this.context.tenantId,
        archivedAt: null,
        ...(ids !== null ? { clinicId: { in: ids } } : {}),
      },
      select: { estimatedValueCents: true, stage: { select: { type: true } } },
      take: 1000,
    });
    return rows.reduce(
      (metrics, row) => {
        metrics.total++;
        metrics[row.stage.type.toLowerCase() as "open" | "won" | "lost"]++;
        metrics.estimatedValueCents += row.estimatedValueCents;
        return metrics;
      },
      { total: 0, open: 0, won: 0, lost: 0, estimatedValueCents: 0 },
    );
  }
}

function patientRelationScope(context: ApplicationContext) {
  const ids = scopedClinicIds(context);
  if (ids === null) return {};
  return {
    OR: [
      { appointments: { some: { tenantId: context.tenantId, clinicId: { in: ids } } } },
      { leads: { some: { tenantId: context.tenantId, clinicId: { in: ids } } } },
      { treatmentPlans: { some: { tenantId: context.tenantId, clinicId: { in: ids } } } },
    ],
  };
}

export class ScopedPatientReader implements PatientReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  async list(query: Parameters<PatientReader["list"]>[0] = {}) {
    const { offset, limit } = normalizePage(query);
    const ids = scopedClinicIds(this.context);
    const relationScope = patientRelationScope(this.context);
    const where = {
      tenantId: this.context.tenantId,
      ...relationScope,
      ...(query.archived === undefined ? {} : { archivedAt: query.archived ? { not: null } : null }),
      ...(query.search
        ? {
            AND: [
              relationScope,
              {
                OR: [
                  { name: { contains: query.search, mode: "insensitive" as const } },
                  { phoneE164: { contains: query.search } },
                  { emailNormalized: { contains: query.search.toLowerCase(), mode: "insensitive" as const } },
                ],
              },
            ],
          }
        : {}),
    };
    const select = {
      id: true,
      name: true,
      phoneE164: true,
      emailNormalized: true,
      birthDate: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
      appointments: {
        where: {
          tenantId: this.context.tenantId,
          startsAt: { gte: new Date() },
          ...(ids !== null ? { clinicId: { in: ids } } : {}),
        },
        select: { startsAt: true },
        orderBy: { startsAt: "asc" as const },
        take: 1,
      },
      _count: {
        select: {
          appointments: {
            where: ids !== null ? { clinicId: { in: ids } } : {},
          },
        },
      },
    } as const;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        select,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.patient.count({ where }),
    ]);
    return page(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        contact: { phone: row.phoneE164, email: row.emailNormalized },
        birthDate: toDateOnly(row.birthDate),
        archived: Boolean(row.archivedAt),
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
        nextAppointmentAt: row.appointments[0] ? toIso(row.appointments[0].startsAt) : null,
        appointmentCount: row._count.appointments,
      })),
      total,
      offset,
      limit,
    );
  }

  async findById(id: string): Promise<PatientDetails | null> {
    const ids = scopedClinicIds(this.context);
    const relationScope = patientRelationScope(this.context);
    const row = await this.prisma.patient.findFirst({
      where: { id, tenantId: this.context.tenantId, ...relationScope },
      select: {
        id: true,
        name: true,
        phoneE164: true,
        emailNormalized: true,
        birthDate: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        leads: {
          where: {
            tenantId: this.context.tenantId,
            ...(ids !== null ? { clinicId: { in: ids } } : {}),
          },
          select: { id: true, name: true, createdAt: true },
        },
        appointments: {
          where: {
            tenantId: this.context.tenantId,
            ...(ids !== null ? { clinicId: { in: ids } } : {}),
          },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            status: true,
            priceCents: true,
            clinic: { select: { name: true } },
            professionalClinic: { select: { professional: { select: { name: true } } } },
            procedure: { select: { name: true } },
          },
          orderBy: [{ startsAt: "desc" }, { id: "desc" }],
          take: 100,
        },
        treatmentPlans: {
          where: {
            tenantId: this.context.tenantId,
            ...(ids !== null ? { clinicId: { in: ids } } : {}),
          },
          select: { id: true, title: true, createdAt: true },
        },
        conversations: {
          where:
            ids !== null
              ? { tenantId: this.context.tenantId, lead: { clinicId: { in: ids } } }
              : { tenantId: this.context.tenantId },
          select: { id: true, channel: true, createdAt: true },
        },
      },
    });
    if (!row) return null;
    const appointments = row.appointments.map((item) => ({
      id: item.id,
      startsAt: toIso(item.startsAt),
      endsAt: toIso(item.endsAt),
      status: mapAppointmentStatus(item.status),
      clinicName: item.clinic.name,
      professionalName: item.professionalClinic.professional.name,
      procedureName: item.procedure?.name ?? null,
      priceCents: item.priceCents,
    }));
    const timeline: PatientTimelineItem[] = [
      { id: `patient-${row.id}`, type: "created", occurredAt: toIso(row.createdAt), title: "Paciente cadastrado", details: "Cadastro criado no FlipSchedule." },
      ...row.leads.map((item) => ({ id: `lead-${item.id}`, type: "lead" as const, occurredAt: toIso(item.createdAt), title: "Lead relacionado", details: item.name })),
      ...row.appointments.map((item) => ({ id: `appointment-${item.id}`, type: "appointment" as const, occurredAt: toIso(item.startsAt), title: "Agendamento", details: `${item.clinic.name} · ${mapAppointmentStatus(item.status)}` })),
      ...row.treatmentPlans.map((item) => ({ id: `plan-${item.id}`, type: "treatment_plan" as const, occurredAt: toIso(item.createdAt), title: "Orçamento", details: item.title })),
      ...row.conversations.map((item) => ({ id: `conversation-${item.id}`, type: "conversation" as const, occurredAt: toIso(item.createdAt), title: "Conversa", details: item.channel })),
    ];
    timeline.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    return {
      id: row.id,
      name: row.name,
      contact: { phone: row.phoneE164, email: row.emailNormalized },
      birthDate: toDateOnly(row.birthDate),
      archived: Boolean(row.archivedAt),
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      nextAppointmentAt: appointments.filter((item) => new Date(item.startsAt) >= new Date()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]?.startsAt ?? null,
      appointmentCount: appointments.length,
      address: { available: false as const },
      appointments,
      timeline,
      treatmentPlanCount: row.treatmentPlans.length,
      conversationCount: row.conversations.length,
      leadIds: row.leads.map((item) => item.id),
    };
  }

  async duplicates(input: { phone?: string; email?: string; excludeId?: string }) {
    if (!input.phone && !input.email) return [];
    const relationScope = patientRelationScope(this.context);
    const rows = await this.prisma.patient.findMany({
      where: {
        tenantId: this.context.tenantId,
        ...relationScope,
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
        OR: [
          ...(input.phone ? [{ phoneE164: input.phone }] : []),
          ...(input.email ? [{ emailNormalized: input.email.toLowerCase() }] : []),
        ],
      },
      select: { id: true, name: true, phoneE164: true, emailNormalized: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 10,
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      matchedBy: row.phoneE164 === input.phone ? "phone" as const : "email" as const,
    }));
  }
}
