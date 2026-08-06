import "server-only";

import { z } from "zod";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";

const PAGE_SIZE = 20;

export const platformSubscriptionDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  q: z.string().trim().max(120).catch(""),
  status: z
    .enum(["ALL", "PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED", "EXPIRED"])
    .catch("ALL"),
  provider: z.enum(["ALL", "MANUAL", "ASAAS"]).catch("ALL"),
});

export class PlatformSubscriptionDirectoryReader {
  constructor(private readonly prisma: PrismaClient) {}

  async read(context: PlatformContext, input: unknown = {}) {
    requirePlatformPermission(context.role, "platform.subscriptions.read");
    const query = platformSubscriptionDirectoryQuerySchema.parse(input);
    const where: Prisma.SubscriptionWhereInput = {
      ...(query.status === "ALL" ? {} : { status: query.status }),
      ...(query.provider === "ALL" ? {} : { provider: query.provider }),
      ...(query.q
        ? {
            OR: [
              { planCode: { contains: query.q, mode: "insensitive" } },
              { tenant: { is: { name: { contains: query.q, mode: "insensitive" } } } },
              { tenant: { is: { slug: { contains: query.q, mode: "insensitive" } } } },
              {
                commercialPlan: {
                  is: {
                    OR: [
                      { name: { contains: query.q, mode: "insensitive" } },
                      { code: { contains: query.q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const now = new Date();
    const [total, rows, statusGroups, overduePayments, activeEntitlements] = await Promise.all([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        select: {
          id: true,
          provider: true,
          planCode: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          gracePeriodEndsAt: true,
          lastSyncedAt: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,
          commercialPlan: {
            select: {
              id: true,
              code: true,
              name: true,
              cycle: true,
              priceCents: true,
              status: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              entitlements: {
                where: {
                  status: "ACTIVE",
                  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
                },
                select: {
                  id: true,
                  type: true,
                  status: true,
                  startsAt: true,
                  endsAt: true,
                  createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
            },
          },
          payments: {
            select: {
              id: true,
              provider: true,
              status: true,
              amountCents: true,
              dueAt: true,
              paidAt: true,
              failedAt: true,
              createdAt: true,
            },
            orderBy: [{ dueAt: "desc" }, { createdAt: "desc" }],
            take: 5,
          },
          _count: { select: { payments: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.subscription.groupBy({ by: ["status"], _count: true }),
      this.prisma.payment.count({ where: { status: "OVERDUE" } }),
      this.prisma.accessEntitlement.count({
        where: {
          status: "ACTIVE",
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      }),
    ]);

    return {
      rows,
      summary: {
        subscriptions: statusGroups,
        overduePayments,
        activeEntitlements,
      },
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      filters: { q: query.q, status: query.status, provider: query.provider },
    };
  }
}
