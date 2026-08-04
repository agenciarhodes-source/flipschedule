import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { AuthAccessDeniedError } from "./errors";
import { normalizeEmail } from "./utils";

/**
 * Resolves the trusted active membership for an already authenticated user.
 * The caller may provide a requested tenant slug and an untrusted preference;
 * both are validated against ACTIVE memberships and ACTIVE tenants.
 */
export async function resolveAuthenticatedUserContext(
  prisma: PrismaClient,
  userId: string,
  requestedTenantSlug?: string,
  preferredTenantSlug?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      emailNormalized: true,
      status: true,
      emailVerifiedAt: true,
      mustChangePassword: true,
      memberships: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          tenantId: true,
          role: true,
          status: true,
          acceptedAt: true,
          createdAt: true,
          tenant: {
            select: {
              id: true,
              slug: true,
              status: true,
              name: true,
              timezone: true,
            },
          },
        },
      },
    },
  });

  if (!user || user.status !== "ACTIVE" || !user.emailVerifiedAt) {
    throw new AuthAccessDeniedError();
  }

  if (user.mustChangePassword) {
    return { firstAccessRequired: true as const, userId: user.id };
  }

  const eligible = user.memberships.filter(
    (membership) =>
      membership.status === "ACTIVE" && membership.tenant.status === "ACTIVE",
  );
  const requested = requestedTenantSlug
    ? eligible.find((membership) => membership.tenant.slug === requestedTenantSlug)
    : undefined;
  if (requestedTenantSlug && !requested) throw new AuthAccessDeniedError();

  const preferred = !requested && preferredTenantSlug
    ? eligible.find((membership) => membership.tenant.slug === preferredTenantSlug)
    : undefined;
  const activeMembership = requested ?? preferred ?? [...eligible].sort(
    (left, right) =>
      (left.acceptedAt?.getTime() ?? left.createdAt.getTime()) -
        (right.acceptedAt?.getTime() ?? right.createdAt.getTime()) ||
      left.tenant.slug.localeCompare(right.tenant.slug),
  )[0];

  if (
    !activeMembership ||
    activeMembership.status !== "ACTIVE" ||
    activeMembership.tenant.status !== "ACTIVE"
  ) {
    throw new AuthAccessDeniedError();
  }

  return {
    firstAccessRequired: false as const,
    userId: user.id,
    displayName: user.displayName,
    email: normalizeEmail(user.emailNormalized),
    membershipId: activeMembership.id,
    tenantId: activeMembership.tenant.id,
    tenantSlug: activeMembership.tenant.slug,
    tenantTimezone: activeMembership.tenant.timezone,
    tenantName: activeMembership.tenant.name,
    tenantStatus: activeMembership.tenant.status,
    membershipRole: activeMembership.role,
    membershipStatus: activeMembership.status,
    availableTenants: eligible
      .map((membership) => ({
        membershipId: membership.id,
        tenantSlug: membership.tenant.slug,
        tenantName: membership.tenant.name,
      }))
      .sort((left, right) => left.tenantName.localeCompare(right.tenantName)),
  };
}
