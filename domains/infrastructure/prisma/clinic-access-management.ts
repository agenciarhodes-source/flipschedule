import "server-only";

import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import { actionFailure } from "@/domains/application/actions";
import { hasPermission } from "@/domains/application/rbac";
import { getPrismaClient } from "@/lib/db";

const uuid = z.string().uuid();

export class ClinicAccessManagementService {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  async read() {
    if (!hasPermission(this.context.membershipRole, "team.read")) return null;
    const [clinics, rows] = await Promise.all([
      this.prisma.clinic.findMany({
        where: { tenantId: this.context.tenantId },
        select: { id: true, name: true, slug: true, status: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      this.prisma.membershipClinicAccess.findMany({
        where: { tenantId: this.context.tenantId, active: true },
        select: { membershipId: true, clinicId: true },
        orderBy: [{ membershipId: "asc" }, { clinicId: "asc" }],
      }),
    ]);

    return {
      clinics,
      byMembership: rows.reduce<Record<string, string[]>>((acc, row) => {
        (acc[row.membershipId] ??= []).push(row.clinicId);
        return acc;
      }, {}),
    };
  }

  async replace(membershipId: unknown, clinicIds: unknown) {
    if (!hasPermission(this.context.membershipRole, "team.manage_clinic_access")) {
      return actionFailure("ACCESS_DENIED", "Você não tem permissão para administrar unidades da equipe.");
    }

    const parsed = z.object({
      membershipId: uuid,
      clinicIds: z.array(uuid).max(100),
    }).safeParse({ membershipId, clinicIds });
    if (!parsed.success) {
      return actionFailure("VALIDATION_ERROR", "Revise as unidades selecionadas.");
    }

    const uniqueClinicIds = [...new Set(parsed.data.clinicIds)];
    try {
      return await this.prisma.$transaction(async (tx) => {
        const target = await tx.membership.findFirst({
          where: { id: parsed.data.membershipId, tenantId: this.context.tenantId },
          select: { id: true, role: true, status: true },
        });
        if (!target) return actionFailure("NOT_FOUND", "Membro não encontrado.");
        if (target.role === "OWNER" || target.role === "MANAGER") {
          return actionFailure("CONFLICT", "Proprietários e gestores possuem acesso a todas as unidades.");
        }

        const count = await tx.clinic.count({
          where: { tenantId: this.context.tenantId, id: { in: uniqueClinicIds } },
        });
        if (count !== uniqueClinicIds.length) {
          return actionFailure("NOT_FOUND", "Uma das unidades selecionadas não pertence à organização.");
        }

        await tx.membershipClinicAccess.updateMany({
          where: { tenantId: this.context.tenantId, membershipId: target.id, active: true },
          data: { active: false },
        });
        for (const clinicId of uniqueClinicIds) {
          await tx.membershipClinicAccess.upsert({
            where: { membershipId_clinicId: { membershipId: target.id, clinicId } },
            create: {
              tenantId: this.context.tenantId,
              membershipId: target.id,
              clinicId,
              active: true,
            },
            update: { tenantId: this.context.tenantId, active: true },
          });
        }

        await tx.auditLog.create({
          data: {
            tenantId: this.context.tenantId,
            actorUserId: this.context.userId,
            actorMembershipId: this.context.membershipId,
            action: "team.member.clinic_access_replaced",
            resourceType: "Membership",
            resourceId: target.id,
            outcome: "SUCCESS",
            metadata: { clinicCount: uniqueClinicIds.length },
          },
        });

        return { ok: true as const, data: { id: target.id, clinicIds: uniqueClinicIds } };
      }, { isolationLevel: "Serializable" });
    } catch {
      return actionFailure("UNAVAILABLE", "Não foi possível atualizar o acesso às unidades.");
    }
  }
}
