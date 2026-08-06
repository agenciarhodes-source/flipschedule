import "server-only";

import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { maskEmail, requirePlatformPermission } from "@/domains/application/platform";

const PAGE_SIZE = 25;

export const platformUserDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  q: z.string().trim().max(120).catch(""),
  status: z.enum(["ALL", "ACTIVE", "SUSPENDED", "DISABLED"]).catch("ALL"),
});

export const platformOperatorDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  q: z.string().trim().max(120).catch(""),
  role: z
    .enum(["ALL", "PLATFORM_OWNER", "PLATFORM_ADMIN", "SUPPORT", "BILLING", "READONLY"])
    .catch("ALL"),
  status: z.enum(["ALL", "ACTIVE", "SUSPENDED", "REVOKED"]).catch("ALL"),
});

export class PlatformAdministrationDirectoryReader {
  constructor(private readonly prisma: PrismaClient) {}

  async users(context: PlatformContext, input: unknown = {}) {
    requirePlatformPermission(context.role, "platform.users.read");
    const query = platformUserDirectoryQuerySchema.parse(input);
    const where = {
      ...(query.status === "ALL" ? {} : { status: query.status }),
      ...(query.q
        ? {
            OR: [
              { displayName: { contains: query.q, mode: "insensitive" as const } },
              { emailNormalized: { contains: query.q, mode: "insensitive" as const } },
              {
                memberships: {
                  some: {
                    tenant: {
                      is: {
                        OR: [
                          { name: { contains: query.q, mode: "insensitive" as const } },
                          { slug: { contains: query.q, mode: "insensitive" as const } },
                        ],
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          displayName: true,
          emailNormalized: true,
          status: true,
          emailVerified: true,
          mustChangePassword: true,
          firstAccessCompletedAt: true,
          createdAt: true,
          updatedAt: true,
          platformOperator: { select: { id: true, role: true, status: true } },
          memberships: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              role: true,
              status: true,
              acceptedAt: true,
              tenant: { select: { id: true, name: true, slug: true, status: true } },
            },
          },
          _count: { select: { memberships: true, authSessions: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    return {
      rows: rows.map(({ emailNormalized, ...row }) => ({
        ...row,
        emailMasked: maskEmail(emailNormalized),
      })),
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      filters: { q: query.q, status: query.status },
    };
  }

  async operators(context: PlatformContext, input: unknown = {}) {
    requirePlatformPermission(context.role, "platform.operators.read");
    const query = platformOperatorDirectoryQuerySchema.parse(input);
    const where = {
      ...(query.role === "ALL" ? {} : { role: query.role }),
      ...(query.status === "ALL" ? {} : { status: query.status }),
      ...(query.q
        ? {
            user: {
              is: {
                OR: [
                  { displayName: { contains: query.q, mode: "insensitive" as const } },
                  { emailNormalized: { contains: query.q, mode: "insensitive" as const } },
                ],
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.platformOperator.count({ where }),
      this.prisma.platformOperator.findMany({
        where,
        select: {
          id: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              emailNormalized: true,
              status: true,
              emailVerified: true,
              _count: { select: { authSessions: true } },
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    return {
      rows: rows.map(({ user, ...row }) => ({
        ...row,
        user: {
          ...user,
          emailMasked: maskEmail(user.emailNormalized),
          emailNormalized: undefined,
        },
      })),
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      filters: { q: query.q, role: query.role, status: query.status },
    };
  }
}
