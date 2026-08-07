import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import type { ConversationReader, TreatmentPlanReader } from "@/domains/application/readers";
import { canAccessClinic, scopedClinicIds } from "@/domains/application/clinic-access";
import { normalizePage, parseDateRange } from "@/domains/application/query";
import { getPrismaClient } from "@/lib/db";

const iso = (date: Date | null) => date?.toISOString() ?? null;
const lower = (value: string) => value.toLowerCase() as never;
const paged = <T,>(items: T[], total: number, offset: number, limit: number) => ({
  items,
  page: { offset, limit, total, hasMore: offset + items.length < total },
});
const professionalScope = (context: ApplicationContext) =>
  context.membershipRole === "PROFESSIONAL"
    ? { professional: { membershipId: context.membershipId } }
    : {};

const planSelect = {
  id: true,
  title: true,
  status: true,
  patientId: true,
  professionalId: true,
  clinicId: true,
  leadId: true,
  subtotalCents: true,
  discountCents: true,
  totalCents: true,
  expiresAt: true,
  sentAt: true,
  acceptedAt: true,
  rejectedAt: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { name: true } },
  professional: { select: { name: true } },
  clinic: { select: { name: true } },
} as const;

type PlanRow = Prisma.TreatmentPlanGetPayload<{ select: typeof planSelect }>;
function plan(row: PlanRow) {
  return {
    id: row.id,
    title: row.title,
    status: lower(row.status),
    patientId: row.patientId,
    patientName: row.patient.name,
    professionalId: row.professionalId,
    professionalName: row.professional?.name ?? null,
    clinicId: row.clinicId,
    clinicName: row.clinic?.name ?? null,
    leadId: row.leadId,
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    totalCents: row.totalCents,
    expiresAt: iso(row.expiresAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function planClinicScope(context: ApplicationContext, requested?: string) {
  if (requested && !canAccessClinic(context, requested)) return { impossible: true as const };
  const ids = scopedClinicIds(context);
  if (requested) return { clinicId: requested };
  if (ids !== null) return { clinicId: { in: ids } };
  return {};
}

export class ScopedTreatmentPlanReader implements TreatmentPlanReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  async list(query: Parameters<TreatmentPlanReader["list"]>[0] = {}) {
    const { offset, limit } = normalizePage({ ...query, limit: query.limit ?? 25 });
    const range = query.range ? parseDateRange(query.range) : null;
    const scope = planClinicScope(this.context, query.clinicId);
    if ("impossible" in scope) return paged([], 0, offset, limit);
    const where = {
      tenantId: this.context.tenantId,
      ...professionalScope(this.context),
      ...scope,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              { patient: { name: { contains: query.search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status.toUpperCase() as never } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.professionalId ? { professionalId: query.professionalId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(range ? { createdAt: { gte: range.from, lt: range.to } } : {}),
      ...(query.expiringSoon
        ? { expiresAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 864e5) } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.treatmentPlan.findMany({
        where,
        select: planSelect,
        orderBy: [{ updatedAt: query.direction ?? "desc" }, { id: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.treatmentPlan.count({ where }),
    ]);
    return paged(rows.map(plan), total, offset, limit);
  }

  async findById(id: string) {
    const scope = planClinicScope(this.context);
    const row = await this.prisma.treatmentPlan.findFirst({
      where: {
        id,
        tenantId: this.context.tenantId,
        ...professionalScope(this.context),
        ...("impossible" in scope ? { id: "__denied__" } : scope),
      },
      select: {
        ...planSelect,
        items: {
          where: { tenantId: this.context.tenantId },
          select: {
            id: true,
            procedureId: true,
            description: true,
            quantity: true,
            unitPriceCents: true,
            discountCents: true,
            totalCents: true,
            position: true,
            procedure: { select: { name: true } },
          },
          orderBy: [{ position: "asc" }, { id: "asc" }],
        },
        statusHistory: {
          where: { tenantId: this.context.tenantId },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            changedAt: true,
            reason: true,
          },
          orderBy: [{ changedAt: "desc" }, { id: "desc" }],
        },
      },
    });
    return row
      ? {
          ...plan(row),
          sentAt: iso(row.sentAt),
          acceptedAt: iso(row.acceptedAt),
          rejectedAt: iso(row.rejectedAt),
          createdAt: row.createdAt.toISOString(),
          items: row.items.map((item) => ({
            ...item,
            procedureName: item.procedure?.name ?? null,
          })),
          history: row.statusHistory.map((item) => ({
            id: item.id,
            fromStatus: item.fromStatus ? lower(item.fromStatus) : null,
            toStatus: lower(item.toStatus),
            changedAt: item.changedAt.toISOString(),
            reason: item.reason,
          })),
        }
      : null;
  }
}

type ContactRow = {
  patient: { id: string; name: string } | null;
  lead: { id: string; name: string } | null;
};
function contact(row: ContactRow) {
  return row.patient
    ? { kind: "patient" as const, id: row.patient.id, name: row.patient.name }
    : row.lead
      ? { kind: "lead" as const, id: row.lead.id, name: row.lead.name }
      : { kind: "unlinked" as const, id: null, name: "Contato não vinculado" };
}
type ConversationRow = ContactRow & {
  id: string;
  channel: string;
  status: string;
  integrationId: string | null;
  lastMessageAt: Date | null;
  messages?: Array<{ bodyPreviewRedacted: string | null }>;
  _count?: { messages: number };
};
function convo(row: ConversationRow) {
  const message = row.messages?.[0];
  return {
    id: row.id,
    channel: lower(row.channel),
    status: lower(row.status),
    contact: contact(row),
    integrationId: row.integrationId,
    lastMessageAt: iso(row.lastMessageAt),
    unreadCount: row._count?.messages ?? 0,
    preview: message?.bodyPreviewRedacted ?? null,
  };
}

function conversationScope(context: ApplicationContext) {
  const ids = scopedClinicIds(context);
  if (ids !== null) {
    // A restricted unit can only open conversations attached to leads with an
    // explicit clinic. Patient-only conversations remain tenant-wide and are
    // intentionally hidden until Conversation gains its own clinicId.
    return { lead: { clinicId: { in: ids } } };
  }
  if (context.membershipRole === "PROFESSIONAL") {
    return {
      patient: {
        appointments: {
          some: {
            tenantId: context.tenantId,
            professionalClinic: { professional: { membershipId: context.membershipId } },
          },
        },
      },
    };
  }
  return {};
}

export class ScopedConversationReader implements ConversationReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  async list(query: Parameters<ConversationReader["list"]>[0] = {}) {
    const { offset, limit } = normalizePage({ ...query, limit: query.limit ?? 30 });
    const range = query.range ? parseDateRange(query.range) : null;
    const unread = {
      messages: {
        some: { tenantId: this.context.tenantId, direction: "INBOUND" as const, readAt: null },
      },
    };
    const scope = conversationScope(this.context);
    const where = {
      tenantId: this.context.tenantId,
      ...scope,
      ...(query.channel ? { channel: query.channel.toUpperCase() as never } : {}),
      ...(query.status ? { status: query.status.toUpperCase() as never } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.integrationId ? { integrationId: query.integrationId } : {}),
      ...(range ? { createdAt: { gte: range.from, lt: range.to } } : {}),
      ...(query.unread ? unread : {}),
      ...(query.search
        ? {
            OR: [
              { patient: { name: { contains: query.search, mode: "insensitive" as const } } },
              { lead: { name: { contains: query.search, mode: "insensitive" as const } } },
              {
                messages: {
                  some: {
                    tenantId: this.context.tenantId,
                    bodyPreviewRedacted: { contains: query.search, mode: "insensitive" as const },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const select = {
      id: true,
      channel: true,
      status: true,
      integrationId: true,
      lastMessageAt: true,
      patient: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      messages: {
        where: { tenantId: this.context.tenantId },
        select: { bodyPreviewRedacted: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
      },
      _count: {
        select: {
          messages: {
            where: { tenantId: this.context.tenantId, direction: "INBOUND" as const, readAt: null },
          },
        },
      },
    } satisfies Prisma.ConversationSelect;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        select,
        orderBy: [{ lastMessageAt: query.direction ?? "desc" }, { id: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return paged(rows.map(convo), total, offset, limit);
  }

  async findById(id: string, input: { limit?: number; before?: string } = {}) {
    const limit = Math.min(50, Math.max(1, input.limit ?? 50));
    const before = input.before ? new Date(input.before) : null;
    const row = await this.prisma.conversation.findFirst({
      where: { id, tenantId: this.context.tenantId, ...conversationScope(this.context) },
      select: {
        id: true,
        channel: true,
        status: true,
        integrationId: true,
        lastMessageAt: true,
        patientId: true,
        leadId: true,
        patient: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
        _count: {
          select: {
            messages: {
              where: { tenantId: this.context.tenantId, direction: "INBOUND", readAt: null },
            },
          },
        },
        messages: {
          where: {
            tenantId: this.context.tenantId,
            ...(before ? { createdAt: { lt: before } } : {}),
          },
          select: {
            id: true,
            direction: true,
            status: true,
            contentType: true,
            bodyPreviewRedacted: true,
            createdAt: true,
            readAt: true,
            attempts: true,
            nextAttemptAt: true,
            lastErrorCode: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit + 1,
        },
      },
    });
    if (!row) return null;
    const more = row.messages.length > limit;
    const messages = row.messages.slice(0, limit);
    return {
      ...convo({ ...row, messages: [...messages].slice(0, 1) }),
      patientId: row.patientId,
      leadId: row.leadId,
      messages: messages.reverse().map((message) => ({
        id: message.id,
        direction: lower(message.direction),
        status: lower(message.status),
        contentType: message.contentType,
        preview: message.bodyPreviewRedacted,
        createdAt: message.createdAt.toISOString(),
        readAt: iso(message.readAt),
        attempts: message.attempts,
        nextAttemptAt: iso(message.nextAttemptAt),
        lastErrorCode: message.lastErrorCode,
      })),
      messagePage: {
        hasMore: more,
        nextCursor: more ? messages.at(-1)?.createdAt.toISOString() ?? null : null,
      },
    };
  }
}
