import "server-only";

import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import {
  canManagePlatformOperator,
  requirePlatformPermission,
} from "@/domains/application/platform";

const reasonSchema = z.string().trim().min(10).max(500);
const idSchema = z.string().uuid();

export class PlatformAdministrationService {
  constructor(private readonly prisma: PrismaClient) {}

  async changeTenantStatus(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.tenants.manage_status");
    const data = z
      .object({
        tenantId: idSchema,
        status: z.enum(["ACTIVE", "SUSPENDED"]),
        reason: reasonSchema,
      })
      .parse(input);

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.tenant.update({
        where: { id: data.tenantId },
        data: { status: data.status },
      });
      await tx.auditLog.create({
        data: {
          tenantId: row.id,
          actorUserId: context.userId,
          action:
            data.status === "SUSPENDED"
              ? "platform.tenant.suspended"
              : "platform.tenant.reactivated",
          resourceType: "Tenant",
          resourceId: row.id,
          outcome: "SUCCESS",
          metadata: { reasonCode: "OPERATOR_CONFIRMED" },
        },
      });
      return row;
    });
  }

  async changeUserStatus(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.users.manage_status");
    const data = z
      .object({
        userId: idSchema,
        status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]),
        reason: reasonSchema,
        confirmation: z.string(),
      })
      .parse(input);

    if (data.userId === context.userId) throw new Error("SELF_STATUS_CHANGE_DENIED");
    if (data.status === "DISABLED" && data.confirmation !== "DESABILITAR USUARIO") {
      throw new Error("CONFIRMATION_REQUIRED");
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350035)`;
        const target = await tx.user.findUnique({
          where: { id: data.userId },
          select: {
            id: true,
            status: true,
            platformOperator: { select: { role: true, status: true } },
          },
        });
        if (!target) throw new Error("USER_NOT_FOUND");
        if (
          target.platformOperator?.role === "PLATFORM_OWNER" &&
          data.status !== "ACTIVE" &&
          context.role !== "PLATFORM_OWNER"
        ) {
          throw new Error("PLATFORM_OWNER_PROTECTED");
        }

        const row = await tx.user.update({
          where: { id: target.id },
          data: { status: data.status },
        });
        const revokedSessions =
          data.status === "ACTIVE"
            ? { count: 0 }
            : await tx.authSession.deleteMany({ where: { userId: target.id } });

        if (data.status !== "ACTIVE") {
          const usableOwners = await tx.platformOperator.count({
            where: {
              role: "PLATFORM_OWNER",
              status: "ACTIVE",
              user: { status: "ACTIVE", emailVerified: true },
            },
          });
          if (usableOwners < 1) throw new Error("LAST_PLATFORM_OWNER_REQUIRED");
        }

        const action =
          data.status === "ACTIVE"
            ? "platform.user.reactivated"
            : data.status === "DISABLED"
              ? "platform.user.disabled"
              : "platform.user.suspended";
        await tx.auditLog.create({
          data: {
            actorUserId: context.userId,
            action,
            resourceType: "User",
            resourceId: row.id,
            outcome: "SUCCESS",
            metadata: {
              previousStatus: target.status,
              nextStatus: row.status,
              revokedSessionCount: revokedSessions.count,
              reasonCode: "OPERATOR_CONFIRMED",
            },
          },
        });
        return row;
      },
      { isolationLevel: "Serializable" },
    );
  }

  async revokeSessions(context: PlatformContext, userId: unknown) {
    requirePlatformPermission(context.role, "platform.sessions.revoke");
    const target = idSchema.parse(userId);
    if (target === context.userId) throw new Error("SELF_REVOCATION_DENIED");

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: target }, select: { id: true } });
      if (!user) throw new Error("USER_NOT_FOUND");
      const result = await tx.authSession.deleteMany({ where: { userId: target } });
      await tx.auditLog.create({
        data: {
          actorUserId: context.userId,
          action: "platform.sessions.revoked",
          resourceType: "User",
          resourceId: target,
          outcome: "SUCCESS",
          metadata: { count: result.count },
        },
      });
      return result;
    });
  }

  async changeOperator(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.operators.manage");
    const data = z
      .object({
        operatorId: idSchema,
        role: z
          .enum(["PLATFORM_OWNER", "PLATFORM_ADMIN", "SUPPORT", "BILLING", "READONLY"])
          .optional(),
        status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]).optional(),
      })
      .refine((value) => value.role !== undefined || value.status !== undefined, {
        message: "OPERATOR_CHANGE_REQUIRED",
      })
      .parse(input);

    if (data.operatorId === context.operatorId) {
      throw new Error("SELF_OPERATOR_CHANGE_DENIED");
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350035)`;
        const target = await tx.platformOperator.findUnique({
          where: { id: data.operatorId },
        });
        if (!target || !canManagePlatformOperator(context.role, target.role, data.role)) {
          throw new Error("PLATFORM_ACCESS_DENIED");
        }

        const row = await tx.platformOperator.update({
          where: { id: target.id },
          data: {
            ...(data.role ? { role: data.role } : {}),
            ...(data.status ? { status: data.status } : {}),
          },
        });
        const usableOwners = await tx.platformOperator.count({
          where: {
            role: "PLATFORM_OWNER",
            status: "ACTIVE",
            user: { status: "ACTIVE", emailVerified: true },
          },
        });
        if (usableOwners < 1) throw new Error("LAST_PLATFORM_OWNER_REQUIRED");

        if (data.status && data.status !== "ACTIVE") {
          await tx.authSession.deleteMany({ where: { userId: target.userId } });
        }

        await tx.auditLog.create({
          data: {
            actorUserId: context.userId,
            action:
              data.status === "REVOKED"
                ? "platform.operator.revoked"
                : data.status === "SUSPENDED"
                  ? "platform.operator.suspended"
                  : data.status === "ACTIVE" && target.status !== "ACTIVE"
                    ? "platform.operator.reactivated"
                    : "platform.operator.role_changed",
            resourceType: "PlatformOperator",
            resourceId: row.id,
            outcome: "SUCCESS",
            metadata: {
              previousRole: target.role,
              nextRole: row.role,
              previousStatus: target.status,
              nextStatus: row.status,
            },
          },
        });
        return row;
      },
      { isolationLevel: "Serializable" },
    );
  }
}
