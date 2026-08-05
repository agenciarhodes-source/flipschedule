import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformContext } from "@/domains/application/platform";
import { maskEmail, requirePlatformPermission } from "@/domains/application/platform";

const pageArgs = (page = 1, pageSize = 25) => ({
  skip: (Math.max(1, page) - 1) * Math.min(50, Math.max(1, pageSize)),
  take: Math.min(50, Math.max(1, pageSize)),
});

export class PlatformAdminReader {
  constructor(private readonly prisma: PrismaClient) {}

  async dashboard(context: PlatformContext) {
    requirePlatformPermission(context.role, "platform.dashboard.read");
    const now = new Date();
    const [
      tenants,
      users,
      memberships,
      subscriptions,
      overdue,
      checkouts,
      integrations,
      messages,
      webhooks,
      entitlements,
      grants,
    ] = await Promise.all([
      this.prisma.tenant.groupBy({ by: ["status"], _count: true }),
      this.prisma.user.groupBy({ by: ["status"], _count: true }),
      this.prisma.membership.count({ where: { status: "ACTIVE" } }),
      this.prisma.subscription.groupBy({ by: ["status"], _count: true }),
      this.prisma.payment.count({ where: { status: "OVERDUE" } }),
      this.prisma.billingCheckout.count({ where: { status: { in: ["CREATED", "ACTIVE"] } } }),
      this.prisma.integration.groupBy({ by: ["status"], _count: true }),
      this.prisma.message.groupBy({
        by: ["status"],
        where: { direction: "OUTBOUND" },
        _count: true,
      }),
      this.prisma.webhookEvent.groupBy({ by: ["status"], _count: true }),
      this.prisma.accessEntitlement.count({
        where: { status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      }),
      this.prisma.platformSupportGrant.count({
        where: { revokedAt: null, expiresAt: { gt: now } },
      }),
    ]);
    return {
      tenants,
      users,
      memberships,
      subscriptions,
      overdue,
      checkouts,
      integrations,
      messages,
      webhooks,
      entitlements,
      grants,
      mrr: null,
    };
  }

  async tenants(context: PlatformContext, page = 1, query = "") {
    requirePlatformPermission(context.role, "platform.tenants.read");
    return this.prisma.tenant.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
            ],
          }
        : {},
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            clinics: true,
            memberships: { where: { status: "ACTIVE" } },
            integrations: true,
          },
        },
        subscriptions: {
          select: { status: true, planCode: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
        entitlements: {
          where: { status: "ACTIVE" },
          select: { type: true, status: true, endsAt: true },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
    });
  }

  async clients(context: PlatformContext, page = 1) {
    requirePlatformPermission(context.role, "platform.tenants.read");
    const rows = await this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        timezone: true,
        locale: true,
        createdAt: true,
        memberships: {
          where: { role: "OWNER" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            status: true,
            user: {
              select: {
                displayName: true,
                emailNormalized: true,
                status: true,
                mustChangePassword: true,
              },
            },
          },
        },
        subscriptions: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            planCode: true,
            currentPeriodEnd: true,
            commercialPlan: { select: { id: true, code: true, name: true } },
          },
        },
        _count: { select: { clinics: true, memberships: true } },
      },
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
    });

    return rows.map((row) => {
      const owner = row.memberships[0];
      return {
        ...row,
        memberships: undefined,
        owner: owner
          ? {
              name: owner.user.displayName,
              emailMasked: maskEmail(owner.user.emailNormalized),
              userStatus: owner.user.status,
              membershipStatus: owner.status,
              temporaryPasswordPending: owner.user.mustChangePassword,
            }
          : null,
        subscription: row.subscriptions[0] ?? null,
        subscriptions: undefined,
      };
    });
  }

  async plans(context: PlatformContext, includeInactive = true) {
    requirePlatformPermission(context.role, "platform.plans.read");
    return this.prisma.commercialPlan.findMany({
      where: includeInactive ? {} : { status: "ACTIVE" },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        cycle: true,
        priceCents: true,
        trialDays: true,
        maxClinics: true,
        maxUsers: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { subscriptions: true } },
      },
      orderBy: [{ status: "asc" }, { priceCents: "asc" }, { name: "asc" }],
    });
  }

  async users(context: PlatformContext, page = 1) {
    requirePlatformPermission(context.role, "platform.users.read");
    const rows = await this.prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        emailNormalized: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { memberships: true, authSessions: true } },
        platformOperator: { select: { role: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
    });
    return rows.map(({ emailNormalized, ...row }) => ({
      ...row,
      emailMasked: maskEmail(emailNormalized),
    }));
  }

  async subscriptions(context: PlatformContext, page = 1) {
    requirePlatformPermission(context.role, "platform.subscriptions.read");
    return this.prisma.subscription.findMany({
      select: {
        id: true,
        planCode: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        lastSyncedAt: true,
        commercialPlan: { select: { code: true, name: true } },
        tenant: { select: { name: true, slug: true } },
        payments: {
          select: { id: true, status: true, amountCents: true, dueAt: true },
          orderBy: { dueAt: "desc" },
          take: 3,
        },
      },
      orderBy: { updatedAt: "desc" },
      ...pageArgs(page),
    });
  }

  async operations(context: PlatformContext, page = 1) {
    requirePlatformPermission(context.role, "platform.operations.read");
    const args = pageArgs(page);
    const [webhooks, messages] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        select: {
          id: true,
          provider: true,
          status: true,
          attempts: true,
          lastErrorCode: true,
          correlationId: true,
          receivedAt: true,
        },
        orderBy: { receivedAt: "desc" },
        ...args,
      }),
      this.prisma.message.findMany({
        where: { direction: "OUTBOUND" },
        select: {
          id: true,
          status: true,
          attempts: true,
          lastErrorCode: true,
          correlationId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
    ]);
    return { webhooks, messages };
  }

  async audit(context: PlatformContext, page = 1) {
    requirePlatformPermission(context.role, "platform.audit.read");
    return this.prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        outcome: true,
        correlationId: true,
        occurredAt: true,
        tenantId: true,
        actorUserId: true,
      },
      orderBy: { occurredAt: "desc" },
      ...pageArgs(page),
    });
  }

  async operators(context: PlatformContext, page = 1) {
    requirePlatformPermission(context.role, "platform.operators.read");
    return this.prisma.platformOperator.findMany({
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            displayName: true,
            emailNormalized: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      ...pageArgs(page),
    });
  }
}
