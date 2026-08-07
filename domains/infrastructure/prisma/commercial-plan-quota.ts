import "server-only";

import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import { actionFailure, type ActionResult } from "@/domains/application/actions";
import { commercialQuotaAllows, commercialQuotaState } from "@/domains/application/commercial-quota";
import { hasPermission } from "@/domains/application/rbac";
import { getPrismaClient } from "@/lib/db";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const seatStatuses = ["INVITED", "ACTIVE", "SUSPENDED"] as const;
const commercialSubscriptionStatuses = ["PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED"] as const;
const label = z.string().trim().min(2).max(120);
const clinicSchema = z.object({
  name: label,
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  timezoneOverride: z.string().trim().max(80).nullable().default(null),
  active: z.boolean().default(true),
});

export type CommercialPlanCapacity = {
  managed: boolean;
  subscriptionStatus: string | null;
  plan: {
    id: string;
    code: string;
    name: string;
    cycle: string;
    maxClinics: number | null;
    maxUsers: number | null;
  } | null;
  clinics: {
    active: number;
    limit: number | null;
    remaining: number | null;
    reached: boolean;
  };
  users: {
    members: number;
    pendingInvitations: number;
    reserved: number;
    limit: number | null;
    remaining: number | null;
    reached: boolean;
  };
};

export async function readCommercialPlanCapacity(
  db: DatabaseClient,
  tenantId: string,
  now = new Date(),
): Promise<CommercialPlanCapacity> {
  const [subscription, activeClinics, members, pendingInvitations] = await Promise.all([
    db.subscription.findFirst({
      where: {
        tenantId,
        commercialPlanId: { not: null },
        status: { in: [...commercialSubscriptionStatuses] },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        status: true,
        commercialPlan: {
          select: {
            id: true,
            code: true,
            name: true,
            cycle: true,
            maxClinics: true,
            maxUsers: true,
          },
        },
      },
    }),
    db.clinic.count({ where: { tenantId, status: "ACTIVE" } }),
    db.membership.count({ where: { tenantId, status: { in: [...seatStatuses] } } }),
    db.tenantInvitation.count({
      where: {
        tenantId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    }),
  ]);

  const plan = subscription?.commercialPlan ?? null;
  const reservedUsers = members + pendingInvitations;
  const clinicQuota = commercialQuotaState(activeClinics, plan?.maxClinics ?? null);
  const userQuota = commercialQuotaState(reservedUsers, plan?.maxUsers ?? null);
  return {
    managed: Boolean(plan),
    subscriptionStatus: subscription?.status ?? null,
    plan,
    clinics: {
      active: activeClinics,
      limit: clinicQuota.limit,
      remaining: clinicQuota.remaining,
      reached: clinicQuota.reached,
    },
    users: {
      members,
      pendingInvitations,
      reserved: reservedUsers,
      limit: userQuota.limit,
      remaining: userQuota.remaining,
      reached: userQuota.reached,
    },
  };
}

export async function lockCommercialQuota(tx: Prisma.TransactionClient, tenantId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(350058, hashtext(${tenantId}))`;
}

export async function assertUserQuotaAvailable(
  tx: Prisma.TransactionClient,
  tenantId: string,
  mode: "ADD_RESERVATION" | "CURRENT_RESERVATIONS_VALID" = "ADD_RESERVATION",
) {
  const capacity = await readCommercialPlanCapacity(tx, tenantId);
  if (!capacity.managed || capacity.users.limit === null) return capacity;
  const additional = mode === "ADD_RESERVATION" ? 1 : 0;
  if (!commercialQuotaAllows(capacity.users.reserved, capacity.users.limit, additional)) {
    throw new Error("COMMERCIAL_USER_LIMIT_REACHED");
  }
  return capacity;
}

export class CommercialPlanQuotaReader {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  read() {
    return readCommercialPlanCapacity(this.prisma, this.context.tenantId);
  }
}

export class CommercialClinicService {
  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {}

  private denied<T>(): ActionResult<T> | null {
    return hasPermission(this.context.membershipRole, "clinics.manage")
      ? null
      : actionFailure("ACCESS_DENIED", "Você não tem permissão para administrar unidades.");
  }

  private validation(error: z.ZodError): ActionResult<never> {
    return actionFailure(
      "VALIDATION_ERROR",
      "Revise os campos informados.",
      Object.fromEntries(
        Object.entries(error.flatten().fieldErrors).filter(
          (entry): entry is [string, string[]] => Boolean(entry[1]),
        ),
      ),
    );
  }

  private async audit(
    tx: Prisma.TransactionClient,
    action: string,
    resourceId: string,
    metadata?: Record<string, unknown>,
  ) {
    await tx.auditLog.create({
      data: {
        tenantId: this.context.tenantId,
        actorUserId: this.context.userId,
        actorMembershipId: this.context.membershipId,
        action,
        resourceType: "Clinic",
        resourceId,
        outcome: "SUCCESS",
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  async create(input: unknown) {
    const denied = this.denied();
    if (denied) return denied;
    const parsed = clinicSchema.safeParse(input);
    if (!parsed.success) return this.validation(parsed.error);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await lockCommercialQuota(tx, this.context.tenantId);
          if (parsed.data.active) {
            const capacity = await readCommercialPlanCapacity(tx, this.context.tenantId);
            if (capacity.clinics.reached) {
              return actionFailure(
                "CONFLICT",
                `O plano atual permite no máximo ${capacity.clinics.limit} unidade(s) ativa(s).`,
              );
            }
          }

          const row = await tx.clinic.create({
            data: {
              tenantId: this.context.tenantId,
              name: parsed.data.name,
              slug: parsed.data.slug,
              timezoneOverride: parsed.data.timezoneOverride,
              status: parsed.data.active ? "ACTIVE" : "INACTIVE",
            },
            select: { id: true },
          });
          await this.audit(tx, "clinic.create", row.id, { quotaChecked: parsed.data.active });
          return { ok: true as const, data: row };
        },
        { isolationLevel: "Serializable" },
      );
    } catch {
      return actionFailure("UNAVAILABLE", "Não foi possível concluir a operação. Tente novamente.");
    }
  }

  async update(id: string, input: unknown) {
    const denied = this.denied();
    if (denied) return denied;
    const parsed = clinicSchema.safeParse(input);
    if (!parsed.success) return this.validation(parsed.error);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await lockCommercialQuota(tx, this.context.tenantId);
          const existing = await tx.clinic.findFirst({
            where: { id, tenantId: this.context.tenantId },
            select: { id: true, status: true },
          });
          if (!existing) return actionFailure("NOT_FOUND", "Unidade não encontrada.");

          const reactivating = existing.status !== "ACTIVE" && parsed.data.active;
          if (reactivating) {
            const capacity = await readCommercialPlanCapacity(tx, this.context.tenantId);
            if (capacity.clinics.reached) {
              return actionFailure(
                "CONFLICT",
                `O plano atual permite no máximo ${capacity.clinics.limit} unidade(s) ativa(s).`,
              );
            }
          }

          await tx.clinic.update({
            where: { id },
            data: {
              name: parsed.data.name,
              slug: parsed.data.slug,
              timezoneOverride: parsed.data.timezoneOverride,
              status: parsed.data.active ? "ACTIVE" : "INACTIVE",
            },
          });
          await this.audit(tx, "clinic.update", id, { quotaChecked: reactivating });
          return { ok: true as const, data: { id } };
        },
        { isolationLevel: "Serializable" },
      );
    } catch {
      return actionFailure("UNAVAILABLE", "Não foi possível concluir a operação. Tente novamente.");
    }
  }
}
