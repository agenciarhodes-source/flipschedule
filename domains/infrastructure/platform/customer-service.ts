import "server-only";

import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import type {
  CommercialPlanCycle,
  CommercialPlanStatus,
  Prisma,
  PrismaClient,
  TenantStatus,
} from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { requirePlatformPermission } from "@/domains/application/platform";
import { passwordSchema } from "@/lib/auth/password-policy";
import { normalizeEmail } from "@/lib/auth/utils";

const uuidSchema = z.string().uuid();
const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const planCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Z0-9]+(?:[_-][A-Z0-9]+)*$/);
const reasonSchema = z.string().trim().min(10).max(500);

export const createCommercialPlanSchema = z.object({
  code: planCodeSchema,
  name: z.string().trim().min(2).max(80),
  cycle: z.enum(["MONTHLY", "YEARLY", "CUSTOM"]),
  priceCents: z.coerce.number().int().min(0).max(100_000_000),
  trialDays: z.coerce.number().int().min(0).max(365).default(0),
  maxClinics: z.coerce.number().int().min(1).max(10_000).nullable().optional(),
  maxUsers: z.coerce.number().int().min(1).max(100_000).nullable().optional(),
});

export const createPlatformClientSchema = z.object({
  tenantName: z.string().trim().min(2).max(120),
  tenantSlug: slugSchema,
  timezone: z.string().trim().min(3).max(80).default("America/Sao_Paulo"),
  locale: z.string().trim().min(2).max(20).default("pt-BR"),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email().max(254).transform(normalizeEmail),
  temporaryPassword: passwordSchema,
  planId: uuidSchema,
});

function calculatePeriodEnd(cycle: CommercialPlanCycle, start: Date) {
  if (cycle === "CUSTOM") return null;
  const end = new Date(start);
  if (cycle === "MONTHLY") end.setUTCMonth(end.getUTCMonth() + 1);
  if (cycle === "YEARLY") end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}

async function assignPlanInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    actorUserId: string;
    tenantId: string;
    plan: {
      id: string;
      code: string;
      cycle: CommercialPlanCycle;
      status: CommercialPlanStatus;
    };
  },
) {
  if (input.plan.status !== "ACTIVE") throw new Error("PLAN_NOT_ACTIVE");

  const startsAt = new Date();
  const endsAt = calculatePeriodEnd(input.plan.cycle, startsAt);
  const externalReference = `manual:${input.tenantId}`;

  const subscription = await tx.subscription.upsert({
    where: {
      tenantId_provider_externalReference: {
        tenantId: input.tenantId,
        provider: "MANUAL",
        externalReference,
      },
    },
    create: {
      tenantId: input.tenantId,
      provider: "MANUAL",
      externalReference,
      commercialPlanId: input.plan.id,
      planCode: input.plan.code,
      status: "ACTIVE",
      currentPeriodStart: startsAt,
      currentPeriodEnd: endsAt,
      lastSyncedAt: startsAt,
      providerStatus: "MANUAL_ACTIVE",
    },
    update: {
      commercialPlanId: input.plan.id,
      planCode: input.plan.code,
      status: "ACTIVE",
      currentPeriodStart: startsAt,
      currentPeriodEnd: endsAt,
      cancelledAt: null,
      lastSyncedAt: startsAt,
      providerStatus: "MANUAL_ACTIVE",
    },
  });

  await tx.accessEntitlement.updateMany({
    where: { tenantId: input.tenantId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: startsAt },
  });

  await tx.accessEntitlement.create({
    data: {
      tenantId: input.tenantId,
      type: "PAID",
      status: "ACTIVE",
      startsAt,
      endsAt,
      reason: `Plano ${input.plan.code} atribuído pela administração da plataforma`,
      grantedByUserId: input.actorUserId,
      metadata: { planId: input.plan.id, subscriptionId: subscription.id },
    },
  });

  return subscription;
}

export class PlatformCustomerAdministrationService {
  constructor(private readonly prisma: PrismaClient) {}

  async createPlan(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.plans.manage");
    const data = createCommercialPlanSchema.parse(input);

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.commercialPlan.create({
        data: {
          code: data.code,
          name: data.name,
          cycle: data.cycle,
          priceCents: data.priceCents,
          trialDays: data.trialDays,
          maxClinics: data.maxClinics ?? null,
          maxUsers: data.maxUsers ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.userId,
          action: "platform.plan.created",
          resourceType: "CommercialPlan",
          resourceId: plan.id,
          outcome: "SUCCESS",
          metadata: { code: plan.code },
        },
      });
      return plan;
    });
  }

  async setPlanStatus(
    context: PlatformContext,
    input: { planId: unknown; status: unknown },
  ) {
    requirePlatformPermission(context.role, "platform.plans.manage");
    const data = z
      .object({
        planId: uuidSchema,
        status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
      })
      .parse(input);

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.commercialPlan.update({
        where: { id: data.planId },
        data: { status: data.status },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: context.userId,
          action: "platform.plan.status_changed",
          resourceType: "CommercialPlan",
          resourceId: plan.id,
          outcome: "SUCCESS",
          metadata: { status: data.status },
        },
      });
      return plan;
    });
  }

  async createClient(context: PlatformContext, input: unknown) {
    requirePlatformPermission(context.role, "platform.tenants.create");
    requirePlatformPermission(context.role, "platform.subscriptions.manage");
    const data = createPlatformClientSchema.parse(input);
    const passwordHash = await hashPassword(data.temporaryPassword);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(350048)`;

        const [plan, existingTenant, existingUser] = await Promise.all([
          tx.commercialPlan.findUnique({ where: { id: data.planId } }),
          tx.tenant.findUnique({ where: { slug: data.tenantSlug }, select: { id: true } }),
          tx.user.findUnique({
            where: { emailNormalized: data.ownerEmail },
            select: { id: true },
          }),
        ]);
        if (!plan || plan.status !== "ACTIVE") throw new Error("PLAN_NOT_ACTIVE");
        if (existingTenant) throw new Error("TENANT_SLUG_CONFLICT");
        if (existingUser) throw new Error("OWNER_EMAIL_CONFLICT");

        const tenant = await tx.tenant.create({
          data: {
            name: data.tenantName,
            slug: data.tenantSlug,
            timezone: data.timezone,
            locale: data.locale,
            clinics: {
              create: {
                name: data.tenantName,
                slug: "principal",
              },
            },
          },
        });
        const user = await tx.user.create({
          data: {
            emailNormalized: data.ownerEmail,
            displayName: data.ownerName,
            status: "ACTIVE",
            emailVerified: true,
            emailVerifiedAt: new Date(),
            mustChangePassword: true,
          },
        });
        const membership = await tx.membership.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            role: "OWNER",
            status: "ACTIVE",
            acceptedAt: new Date(),
          },
        });
        await tx.authAccount.create({
          data: {
            accountId: user.id,
            providerId: "credential",
            userId: user.id,
            password: passwordHash,
          },
        });
        await assignPlanInTransaction(tx, {
          actorUserId: context.userId,
          tenantId: tenant.id,
          plan,
        });
        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorUserId: context.userId,
            action: "platform.client.created",
            resourceType: "Tenant",
            resourceId: tenant.id,
            outcome: "SUCCESS",
            metadata: {
              ownerUserId: user.id,
              ownerMembershipId: membership.id,
              planCode: plan.code,
            },
          },
        });
        return { tenantId: tenant.id, userId: user.id };
      },
      { isolationLevel: "Serializable" },
    );
  }

  async assignPlan(
    context: PlatformContext,
    input: { tenantId: unknown; planId: unknown },
  ) {
    requirePlatformPermission(context.role, "platform.subscriptions.manage");
    const data = z.object({ tenantId: uuidSchema, planId: uuidSchema }).parse(input);

    return this.prisma.$transaction(
      async (tx) => {
        const [tenant, plan] = await Promise.all([
          tx.tenant.findUnique({ where: { id: data.tenantId }, select: { id: true } }),
          tx.commercialPlan.findUnique({ where: { id: data.planId } }),
        ]);
        if (!tenant) throw new Error("TENANT_NOT_FOUND");
        if (!plan || plan.status !== "ACTIVE") throw new Error("PLAN_NOT_ACTIVE");

        const subscription = await assignPlanInTransaction(tx, {
          actorUserId: context.userId,
          tenantId: tenant.id,
          plan,
        });
        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorUserId: context.userId,
            action: "platform.client.plan_assigned",
            resourceType: "Subscription",
            resourceId: subscription.id,
            outcome: "SUCCESS",
            metadata: { planCode: plan.code },
          },
        });
        return subscription;
      },
      { isolationLevel: "Serializable" },
    );
  }

  async setClientStatus(
    context: PlatformContext,
    input: { tenantId: unknown; status: unknown; reason: unknown },
  ) {
    requirePlatformPermission(context.role, "platform.tenants.manage_status");
    const data = z
      .object({
        tenantId: uuidSchema,
        status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]),
        reason: reasonSchema,
      })
      .parse(input);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: data.tenantId },
        data: { status: data.status as TenantStatus },
      });
      if (data.status === "ARCHIVED") {
        await tx.accessEntitlement.updateMany({
          where: { tenantId: tenant.id, status: "ACTIVE" },
          data: { status: "REVOKED", revokedAt: new Date() },
        });
      }
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId: context.userId,
          action:
            data.status === "ACTIVE"
              ? "platform.client.reactivated"
              : data.status === "SUSPENDED"
                ? "platform.client.suspended"
                : "platform.client.archived",
          resourceType: "Tenant",
          resourceId: tenant.id,
          outcome: "SUCCESS",
          metadata: { reason: data.reason },
        },
      });
      return tenant;
    });
  }
}
