import "server-only";

import { z } from "zod";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";

const PAGE_SIZE = 40;
const uuidSchema = z.string().uuid();
const blockedMetadataKey = /token|secret|password|credential|authorization|api.?key|email|phone|address|payload|body|cipher|url/i;

export const auditDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  q: z.string().trim().max(120).catch(""),
  outcome: z.enum(["ALL", "SUCCESS", "DENIED", "FAILED"]).catch("ALL"),
  action: z.string().trim().max(120).catch(""),
});

const abbreviateIdentifier = (value: string | null) => {
  if (!value) return null;
  return value.length <= 18 ? value : `${value.slice(0, 8)}…${value.slice(-6)}`;
};

export function sanitizeAuditMetadata(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (blockedMetadataKey.test(key)) continue;
    if (typeof item === "string") safe[key] = item.slice(0, 120);
    else if (typeof item === "number" || typeof item === "boolean" || item === null) safe[key] = item;
  }
  return Object.keys(safe).length ? safe : null;
}

function auditSearch(q: string): Prisma.AuditLogWhereInput {
  if (!q) return {};
  if (uuidSchema.safeParse(q).success) {
    return {
      OR: [
        { id: q },
        { tenantId: q },
        { actorUserId: q },
        { actorMembershipId: q },
        { resourceId: q },
      ],
    };
  }
  return {
    OR: [
      { action: { contains: q, mode: "insensitive" } },
      { resourceType: { contains: q, mode: "insensitive" } },
      { correlationId: { contains: q, mode: "insensitive" } },
      { tenant: { name: { contains: q, mode: "insensitive" } } },
      { tenant: { slug: { contains: q, mode: "insensitive" } } },
      { actorUser: { displayName: { contains: q, mode: "insensitive" } } },
    ],
  };
}

export class PlatformAuditDirectoryReader {
  constructor(private readonly prisma: PrismaClient) {}

  async read(context: PlatformContext, input: unknown = {}) {
    requirePlatformPermission(context.role, "platform.audit.read");
    const query = auditDirectoryQuerySchema.parse(input);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.outcome === "ALL" ? {} : { outcome: query.outcome }),
      ...(query.action ? { action: { contains: query.action, mode: "insensitive" } } : {}),
      ...auditSearch(query.q),
    };

    const [total, rows, outcomeGroups, recentActions] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          actorUserId: true,
          actorMembershipId: true,
          action: true,
          resourceType: true,
          resourceId: true,
          outcome: true,
          correlationId: true,
          metadata: true,
          occurredAt: true,
          tenant: { select: { name: true, slug: true } },
          actorUser: { select: { displayName: true } },
        },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.auditLog.groupBy({ by: ["outcome"], _count: true }),
      this.prisma.auditLog.groupBy({
        by: ["action"],
        _count: true,
        orderBy: { _count: { action: "desc" } },
        take: 8,
      }),
    ]);

    return {
      rows: rows.map((row) => ({
        ...row,
        displayId: abbreviateIdentifier(row.id),
        displayTenantId: abbreviateIdentifier(row.tenantId),
        actorUserId: abbreviateIdentifier(row.actorUserId),
        actorMembershipId: abbreviateIdentifier(row.actorMembershipId),
        resourceId: abbreviateIdentifier(row.resourceId),
        correlationId: abbreviateIdentifier(row.correlationId),
        metadata: sanitizeAuditMetadata(row.metadata),
      })),
      summary: { outcomeGroups, recentActions },
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      filters: { q: query.q, outcome: query.outcome, action: query.action },
    };
  }
}
