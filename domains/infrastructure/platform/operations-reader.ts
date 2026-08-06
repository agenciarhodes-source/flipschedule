import "server-only";

import { z } from "zod";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";

const pageSize = 20;
const pageSchema = z.coerce.number().int().min(1).catch(1);
const textSchema = z.string().trim().max(120).catch("");

const operationStatusSchema = z
  .enum(["ALL", "PENDING", "PROCESSING", "FAILED", "SENT", "DELIVERED", "READ", "RECEIVED", "PROCESSED"])
  .catch("ALL");

const auditOutcomeSchema = z.enum(["ALL", "SUCCESS", "DENIED", "FAILED"]).catch("ALL");

export type OperationsFilters = {
  page?: unknown;
  status?: unknown;
  tenant?: unknown;
  q?: unknown;
};

export type AuditFilters = {
  page?: unknown;
  outcome?: unknown;
  action?: unknown;
  resourceType?: unknown;
  tenantId?: unknown;
  q?: unknown;
};

export class PlatformOperationsReader {
  constructor(private readonly prisma: PrismaClient) {}

  async operations(context: PlatformContext, input: OperationsFilters = {}) {
    requirePlatformPermission(context.role, "platform.operations.read");

    const page = pageSchema.parse(input.page);
    const status = operationStatusSchema.parse(input.status);
    const tenant = textSchema.parse(input.tenant);
    const q = textSchema.parse(input.q);
    const skip = (page - 1) * pageSize;

    const messageWhere: Prisma.MessageWhereInput = {
      direction: "OUTBOUND",
      ...(status !== "ALL" ? { status: status as Prisma.EnumMessageStatusFilter["equals"] } : {}),
      ...(tenant ? { tenant: { slug: { contains: tenant, mode: "insensitive" } } } : {}),
      ...(q
        ? {
            OR: [
              { correlationId: { contains: q, mode: "insensitive" } },
              { lastErrorCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const webhookWhere: Prisma.WebhookEventWhereInput = {
      ...(status !== "ALL" ? { status: status as Prisma.EnumWebhookStatusFilter["equals"] } : {}),
      ...(tenant ? { tenant: { slug: { contains: tenant, mode: "insensitive" } } } : {}),
      ...(q
        ? {
            OR: [
              { correlationId: { contains: q, mode: "insensitive" } },
              { lastErrorCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [messages, webhooks, messageTotal, webhookTotal, messageSummary, webhookSummary] =
      await Promise.all([
        this.prisma.message.findMany({
          where: messageWhere,
          select: {
            id: true,
            status: true,
            attempts: true,
            nextAttemptAt: true,
            processingStartedAt: true,
            lastErrorCode: true,
            correlationId: true,
            createdAt: true,
            updatedAt: true,
            tenant: { select: { name: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        this.prisma.webhookEvent.findMany({
          where: webhookWhere,
          select: {
            id: true,
            provider: true,
            status: true,
            attempts: true,
            processingStartedAt: true,
            lastErrorCode: true,
            correlationId: true,
            receivedAt: true,
            processedAt: true,
            tenant: { select: { name: true, slug: true } },
          },
          orderBy: { receivedAt: "desc" },
          skip,
          take: pageSize,
        }),
        this.prisma.message.count({ where: messageWhere }),
        this.prisma.webhookEvent.count({ where: webhookWhere }),
        this.prisma.message.groupBy({
          by: ["status"],
          where: { direction: "OUTBOUND" },
          _count: true,
        }),
        this.prisma.webhookEvent.groupBy({ by: ["status"], _count: true }),
      ]);

    const total = Math.max(messageTotal, webhookTotal);
    return {
      messages,
      webhooks,
      summary: { messages: messageSummary, webhooks: webhookSummary },
      filters: { status, tenant, q },
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      messageTotal,
      webhookTotal,
    };
  }

  async audit(context: PlatformContext, input: AuditFilters = {}) {
    requirePlatformPermission(context.role, "platform.audit.read");

    const page = pageSchema.parse(input.page);
    const outcome = auditOutcomeSchema.parse(input.outcome);
    const action = textSchema.parse(input.action);
    const resourceType = textSchema.parse(input.resourceType);
    const tenantId = textSchema.parse(input.tenantId);
    const q = textSchema.parse(input.q);
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {
      ...(outcome !== "ALL" ? { outcome } : {}),
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
      ...(resourceType ? { resourceType: { contains: resourceType, mode: "insensitive" } } : {}),
      ...(tenantId ? { tenantId } : {}),
      ...(q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { resourceType: { contains: q, mode: "insensitive" } },
              { resourceId: { contains: q, mode: "insensitive" } },
              { correlationId: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total, outcomes] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          outcome: true,
          correlationId: true,
          occurredAt: true,
          tenantId: true,
          actorUserId: true,
        },
        orderBy: { occurredAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({ by: ["outcome"], _count: true }),
    ]);

    return {
      rows,
      outcomes,
      filters: { outcome, action, resourceType, tenantId, q },
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
