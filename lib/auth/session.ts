import "server-only";

import { headers } from "next/headers";

import { getPrismaClient } from "@/lib/db/client";
import { AuthAccessDeniedError } from "./errors";
import { getAuth } from "./server";
import { normalizeEmail } from "./utils";

export async function getAuthenticatedSessionContext() {
  const requestHeaders = await headers();
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) throw new AuthAccessDeniedError();

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
          tenant: { select: { id: true, slug: true, status: true, name: true, timezone: true } },
        },
      },
    },
  });

  if (!user || user.status !== "ACTIVE") throw new AuthAccessDeniedError();
  if (!user.emailVerifiedAt) throw new AuthAccessDeniedError();
  if (user.mustChangePassword) return { firstAccessRequired: true as const, userId: user.id };

  const activeMembership = [...(user.memberships ?? [])].sort((a, b) => a.tenantId.localeCompare(b.tenantId))[0];
  if (!activeMembership) throw new AuthAccessDeniedError();
  if (activeMembership.status !== "ACTIVE") throw new AuthAccessDeniedError();
  if (activeMembership.tenant.status !== "ACTIVE") throw new AuthAccessDeniedError();

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
  };
}

export async function getFirstAccessSession() {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;
  const user = await getPrismaClient().user.findUnique({ where: { id: session.user.id }, select: { mustChangePassword: true } });
  return user ? { userId: session.user.id, mustChangePassword: user.mustChangePassword } : null;
}
