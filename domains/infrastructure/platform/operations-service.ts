import "server-only";

import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";

const retrySchema = z.object({
  operationType: z.enum(["MESSAGE", "WEBHOOK"]),
  operationId: z.string().uuid(),
  reason: z.string().trim().min(10).max(500),
});

const staleBefore = () => new Date(Date.now() - 15 * 60 * 1000);

export class PlatformOperationsService {
  constructor(private readonly prisma: PrismaClient) {}

  async retry(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.operations.retry");
    const data = retrySchema.parse(input);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350055)`;

        if (data.operationType === "MESSAGE") {
          const current = await tx.message.findUnique({
            where: { id: data.operationId },
            select: {
              id: true,
              tenantId: true,
              status: true,
              processingStartedAt: true,
              attempts: true,
            },
          });
          if (!current) throw new Error("OPERATION_NOT_FOUND");
          const stale =
            current.status === "PROCESSING" &&
            current.processingStartedAt !== null &&
            current.processingStartedAt <= staleBefore();
          if (current.status !== "FAILED" && !stale) {
            throw new Error("OPERATION_NOT_RETRYABLE");
          }

          const row = await tx.message.update({
            where: { id: current.id },
            data: {
              status: "PENDING",
              nextAttemptAt: new Date(),
              processingStartedAt: null,
              lastErrorCode: null,
            },
            select: { id: true, status: true, tenantId: true },
          });
          await tx.auditLog.create({
            data: {
              tenantId: row.tenantId,
              actorUserId: context.userId,
              action: "platform.operation.message_retry_requested",
              resourceType: "Message",
              resourceId: row.id,
              outcome: "SUCCESS",
              metadata: {
                previousStatus: current.status,
                nextStatus: row.status,
                previousAttempts: current.attempts,
                reasonCode: "OPERATOR_CONFIRMED",
              },
            },
          });
          return row;
        }

        const current = await tx.webhookEvent.findUnique({
          where: { id: data.operationId },
          select: {
            id: true,
            tenantId: true,
            status: true,
            processingStartedAt: true,
            attempts: true,
          },
        });
        if (!current) throw new Error("OPERATION_NOT_FOUND");
        const stale =
          current.status === "PROCESSING" &&
          current.processingStartedAt !== null &&
          current.processingStartedAt <= staleBefore();
        if (current.status !== "FAILED" && !stale) {
          throw new Error("OPERATION_NOT_RETRYABLE");
        }

        const row = await tx.webhookEvent.update({
          where: { id: current.id },
          data: {
            status: "RECEIVED",
            processingStartedAt: null,
            processedAt: null,
            lastErrorCode: null,
          },
          select: { id: true, status: true, tenantId: true },
        });
        await tx.auditLog.create({
          data: {
            tenantId: row.tenantId,
            actorUserId: context.userId,
            action: "platform.operation.webhook_retry_requested",
            resourceType: "WebhookEvent",
            resourceId: row.id,
            outcome: "SUCCESS",
            metadata: {
              previousStatus: current.status,
              nextStatus: row.status,
              previousAttempts: current.attempts,
              reasonCode: "OPERATOR_CONFIRMED",
            },
          },
        });
        return row;
      },
      { isolationLevel: "Serializable" },
    );
  }
}
