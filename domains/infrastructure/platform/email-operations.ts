import "server-only";

import { z } from "zod";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";
import { describeTransactionalEmailOperationalReadiness } from "@/lib/email/config";

const PAGE_SIZE = 25;
const uuidSchema = z.string().uuid();
const reasonSchema = z.string().trim().min(10).max(500);

export const emailDeliveryDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  q: z.string().trim().max(120).catch(""),
  status: z
    .enum([
      "ALL",
      "PENDING",
      "SENT",
      "DELIVERED",
      "DELIVERY_DELAYED",
      "BOUNCED",
      "COMPLAINED",
      "SUPPRESSED",
      "FAILED",
    ])
    .catch("ALL"),
  kind: z.enum(["ALL", "PASSWORD_RESET", "EMAIL_VERIFICATION"]).catch("ALL"),
});

export class PlatformEmailOperationsReader {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly env: Record<string, string | undefined> = process.env,
  ) {}

  async read(context: PlatformContext, input: unknown = {}) {
    requirePlatformPermission(context.role, "platform.email.read");
    const query = emailDeliveryDirectoryQuerySchema.parse(input);
    const where: Prisma.TransactionalEmailDeliveryWhereInput = {
      ...(query.status === "ALL" ? {} : { status: query.status }),
      ...(query.kind === "ALL" ? {} : { kind: query.kind }),
      ...(query.q
        ? {
            OR: [
              { recipientFingerprint: { contains: query.q, mode: "insensitive" } },
              { failureCode: { contains: query.q, mode: "insensitive" } },
              { provider: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, deliveries, statusGroups, kindGroups, suppressions, webhookFailures, recentWebhookEvents] =
      await Promise.all([
        this.prisma.transactionalEmailDelivery.count({ where }),
        this.prisma.transactionalEmailDelivery.findMany({
          where,
          select: {
            id: true,
            kind: true,
            provider: true,
            recipientFingerprint: true,
            status: true,
            failureCode: true,
            lastEventAt: true,
            sentAt: true,
            deliveredAt: true,
            delayedAt: true,
            bouncedAt: true,
            complainedAt: true,
            suppressedAt: true,
            failedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        this.prisma.transactionalEmailDelivery.groupBy({ by: ["status"], _count: true }),
        this.prisma.transactionalEmailDelivery.groupBy({ by: ["kind"], _count: true }),
        this.prisma.emailSuppression.findMany({
          where: { liftedAt: null },
          select: {
            id: true,
            recipientFingerprint: true,
            provider: true,
            reason: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 50,
        }),
        this.prisma.transactionalEmailWebhookEvent.count({
          where: { processedAt: null, failureCode: { not: null } },
        }),
        this.prisma.transactionalEmailWebhookEvent.findMany({
          select: {
            id: true,
            provider: true,
            eventType: true,
            eventOccurredAt: true,
            processedAt: true,
            failureCode: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
        }),
      ]);

    const abbreviateFingerprint = (value: string) =>
      value.length <= 16 ? value : `${value.slice(0, 10)}…${value.slice(-6)}`;

    return {
      readiness: describeTransactionalEmailOperationalReadiness(this.env),
      deliveries: deliveries.map((delivery) => ({
        ...delivery,
        recipientFingerprint: abbreviateFingerprint(delivery.recipientFingerprint),
      })),
      suppressions: suppressions.map((suppression) => ({
        ...suppression,
        recipientFingerprint: abbreviateFingerprint(suppression.recipientFingerprint),
      })),
      recentWebhookEvents,
      summary: {
        statusGroups,
        kindGroups,
        activeSuppressions: suppressions.length,
        webhookFailures,
      },
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      filters: { q: query.q, status: query.status, kind: query.kind },
    };
  }
}

export class PlatformEmailOperationsService {
  constructor(private readonly prisma: PrismaClient) {}

  async liftSuppression(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.email.manage");
    const data = z
      .object({
        suppressionId: uuidSchema,
        reason: reasonSchema,
        confirmation: z.literal("LIBERAR EMAIL"),
      })
      .parse(input);

    return this.prisma.$transaction(async (tx) => {
      const suppression = await tx.emailSuppression.findUnique({
        where: { id: data.suppressionId },
        select: {
          id: true,
          recipientFingerprint: true,
          provider: true,
          reason: true,
          liftedAt: true,
        },
      });
      if (!suppression) throw new Error("SUPPRESSION_NOT_FOUND");
      if (suppression.liftedAt) throw new Error("SUPPRESSION_ALREADY_LIFTED");

      const liftedAt = new Date();
      const updated = await tx.emailSuppression.update({
        where: { id: suppression.id },
        data: { liftedAt },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.userId,
          action: "platform.email.suppression_lifted",
          resourceType: "EmailSuppression",
          resourceId: suppression.id,
          outcome: "SUCCESS",
          metadata: {
            provider: suppression.provider,
            previousReason: suppression.reason,
            reasonCode: "OPERATOR_CONFIRMED",
          },
        },
      });
      return updated;
    });
  }
}
