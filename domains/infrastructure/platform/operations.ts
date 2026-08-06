import "server-only";

import { z } from "zod";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";

const PAGE_SIZE = 20;
const nilUuid = "00000000-0000-0000-0000-000000000000";
const uuidSchema = z.string().uuid();
const reasonSchema = z.string().trim().min(10).max(500);

export const operationsDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  q: z.string().trim().max(120).catch(""),
  queue: z.enum(["ALL", "MESSAGES", "WEBHOOKS"]).catch("ALL"),
  status: z.enum(["ALL", "PENDING", "RECEIVED", "PROCESSING", "FAILED"]).catch("ALL"),
  provider: z
    .enum(["ALL", "WHATSAPP", "INSTAGRAM", "MESSENGER", "FACEBOOK_LEADS", "ASAAS", "EMAIL"])
    .catch("ALL"),
});

export type OperationsDirectoryQuery = z.infer<typeof operationsDirectoryQuerySchema>;

const sanitizeCode = (value: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_:.-]/g, "_").slice(0, 96);
  return normalized || "OPERATION_FAILED";
};

const abbreviateIdentifier = (value: string | null) => {
  if (!value) return null;
  return value.length <= 18 ? value : `${value.slice(0, 8)}…${value.slice(-6)}`;
};

function messageSearch(q: string): Prisma.MessageWhereInput {
  if (!q) return {};
  if (uuidSchema.safeParse(q).success) {
    return { OR: [{ id: q }, { tenantId: q }] };
  }
  return {
    OR: [
      { correlationId: { contains: q, mode: "insensitive" } },
      { lastErrorCode: { contains: q, mode: "insensitive" } },
      { tenant: { name: { contains: q, mode: "insensitive" } } },
      { tenant: { slug: { contains: q, mode: "insensitive" } } },
    ],
  };
}

function webhookSearch(q: string): Prisma.WebhookEventWhereInput {
  if (!q) return {};
  if (uuidSchema.safeParse(q).success) {
    return { OR: [{ id: q }, { tenantId: q }] };
  }
  return {
    OR: [
      { correlationId: { contains: q, mode: "insensitive" } },
      { lastErrorCode: { contains: q, mode: "insensitive" } },
      { tenant: { name: { contains: q, mode: "insensitive" } } },
      { tenant: { slug: { contains: q, mode: "insensitive" } } },
    ],
  };
}

export class PlatformOperationsReader {
  constructor(private readonly prisma: PrismaClient) {}

  async read(context: PlatformContext, input: unknown = {}) {
    requirePlatformPermission(context.role, "platform.operations.read");
    const query = operationsDirectoryQuerySchema.parse(input);
    const includeMessages =
      query.queue !== "WEBHOOKS" && query.status !== "RECEIVED";
    const includeWebhooks =
      query.queue !== "MESSAGES" && query.status !== "PENDING";

    const messageWhere: Prisma.MessageWhereInput = {
      direction: "OUTBOUND",
      status: {
        in:
          query.status === "ALL"
            ? ["PENDING", "PROCESSING", "FAILED"]
            : [query.status as "PENDING" | "PROCESSING" | "FAILED"],
      },
      ...(query.provider === "ALL"
        ? {}
        : { conversation: { integration: { provider: query.provider } } }),
      ...messageSearch(query.q),
    };
    const webhookWhere: Prisma.WebhookEventWhereInput = {
      status: {
        in:
          query.status === "ALL"
            ? ["RECEIVED", "PROCESSING", "FAILED"]
            : [query.status as "RECEIVED" | "PROCESSING" | "FAILED"],
      },
      ...(query.provider === "ALL" ? {} : { provider: query.provider }),
      ...webhookSearch(query.q),
    };

    const [
      messageTotal,
      webhookTotal,
      messages,
      webhooks,
      messageStatusGroups,
      webhookStatusGroups,
    ] = await Promise.all([
      includeMessages ? this.prisma.message.count({ where: messageWhere }) : Promise.resolve(0),
      includeWebhooks ? this.prisma.webhookEvent.count({ where: webhookWhere }) : Promise.resolve(0),
      includeMessages
        ? this.prisma.message.findMany({
            where: messageWhere,
            select: {
              id: true,
              tenantId: true,
              status: true,
              attempts: true,
              nextAttemptAt: true,
              processingStartedAt: true,
              lastErrorCode: true,
              correlationId: true,
              createdAt: true,
              updatedAt: true,
              tenant: { select: { name: true, slug: true } },
              conversation: {
                select: {
                  channel: true,
                  integration: { select: { provider: true } },
                },
              },
            },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
          })
        : Promise.resolve([]),
      includeWebhooks
        ? this.prisma.webhookEvent.findMany({
            where: webhookWhere,
            select: {
              id: true,
              tenantId: true,
              provider: true,
              status: true,
              attempts: true,
              nextAttemptAt: true,
              processingStartedAt: true,
              lastErrorCode: true,
              correlationId: true,
              receivedAt: true,
              updatedAt: true,
              tenant: { select: { name: true, slug: true } },
            },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
          })
        : Promise.resolve([]),
      this.prisma.message.groupBy({
        by: ["status"],
        where: { direction: "OUTBOUND", status: { in: ["PENDING", "PROCESSING", "FAILED"] } },
        _count: true,
      }),
      this.prisma.webhookEvent.groupBy({
        by: ["status"],
        where: { status: { in: ["RECEIVED", "PROCESSING", "FAILED"] } },
        _count: true,
      }),
    ]);

    return {
      messages: messages.map((row) => ({
        ...row,
        displayId: abbreviateIdentifier(row.id),
        displayTenantId: abbreviateIdentifier(row.tenantId),
        correlationId: abbreviateIdentifier(row.correlationId),
        lastErrorCode: sanitizeCode(row.lastErrorCode),
        provider: row.conversation.integration?.provider ?? null,
        retryable: row.status === "FAILED",
      })),
      webhooks: webhooks.map((row) => ({
        ...row,
        displayId: abbreviateIdentifier(row.id),
        displayTenantId: abbreviateIdentifier(row.tenantId),
        correlationId: abbreviateIdentifier(row.correlationId),
        lastErrorCode: sanitizeCode(row.lastErrorCode),
        retryable: row.status === "FAILED",
      })),
      summary: { messageStatusGroups, webhookStatusGroups },
      page: query.page,
      pageSize: PAGE_SIZE,
      totals: { messages: messageTotal, webhooks: webhookTotal, all: messageTotal + webhookTotal },
      totalPages: Math.max(1, Math.ceil(Math.max(messageTotal, webhookTotal) / PAGE_SIZE)),
      filters: {
        q: query.q,
        queue: query.queue,
        status: query.status,
        provider: query.provider,
      },
    };
  }
}

export class PlatformOperationsService {
  constructor(private readonly prisma: PrismaClient) {}

  async requeue(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.operations.retry");
    const data = z
      .object({
        operationId: uuidSchema,
        operationType: z.enum(["MESSAGE", "WEBHOOK"]),
        reason: reasonSchema,
        confirmation: z.literal("REPROCESSAR"),
      })
      .parse(input);

    return this.prisma.$transaction(
      async (tx) => {
        if (data.operationType === "MESSAGE") {
          const row = await tx.message.findFirst({
            where: { id: data.operationId, direction: "OUTBOUND" },
            select: {
              id: true,
              tenantId: true,
              status: true,
              attempts: true,
              lastErrorCode: true,
            },
          });
          if (!row) throw new Error("OPERATION_NOT_FOUND");
          if (row.status !== "FAILED") throw new Error("OPERATION_NOT_RETRYABLE");

          const updated = await tx.message.updateMany({
            where: { id: row.id, tenantId: row.tenantId, direction: "OUTBOUND", status: "FAILED" },
            data: {
              status: "PENDING",
              attempts: 0,
              nextAttemptAt: new Date(),
              processingStartedAt: null,
              failedAt: null,
              lastErrorCode: null,
            },
          });
          if (updated.count !== 1) throw new Error("OPERATION_CONFLICT");
          await tx.auditLog.create({
            data: {
              tenantId: row.tenantId,
              actorUserId: context.userId,
              action: "platform.operation.message_requeued",
              resourceType: "Message",
              resourceId: row.id,
              outcome: "SUCCESS",
              metadata: {
                previousStatus: row.status,
                previousAttempts: row.attempts,
                previousFailureCode: sanitizeCode(row.lastErrorCode),
                reasonCode: "OPERATOR_CONFIRMED",
              },
            },
          });
          return { id: row.id, type: data.operationType } as const;
        }

        const row = await tx.webhookEvent.findUnique({
          where: { id: data.operationId },
          select: {
            id: true,
            tenantId: true,
            status: true,
            attempts: true,
            lastErrorCode: true,
          },
        });
        if (!row) throw new Error("OPERATION_NOT_FOUND");
        if (row.status !== "FAILED") throw new Error("OPERATION_NOT_RETRYABLE");

        const updated = await tx.webhookEvent.updateMany({
          where: { id: row.id, status: "FAILED" },
          data: {
            status: "RECEIVED",
            attempts: 0,
            nextAttemptAt: new Date(),
            processingStartedAt: null,
            lastErrorCode: null,
          },
        });
        if (updated.count !== 1) throw new Error("OPERATION_CONFLICT");
        await tx.auditLog.create({
          data: {
            tenantId: row.tenantId,
            actorUserId: context.userId,
            action: "platform.operation.webhook_requeued",
            resourceType: "WebhookEvent",
            resourceId: row.id,
            outcome: "SUCCESS",
            metadata: {
              previousStatus: row.status,
              previousAttempts: row.attempts,
              previousFailureCode: sanitizeCode(row.lastErrorCode),
              reasonCode: "OPERATOR_CONFIRMED",
            },
          },
        });
        return { id: row.id, type: data.operationType } as const;
      },
      { isolationLevel: "Serializable" },
    );
  }
}

export const platformOperationsTesting = {
  abbreviateIdentifier,
  sanitizeCode,
  nilUuid,
};
