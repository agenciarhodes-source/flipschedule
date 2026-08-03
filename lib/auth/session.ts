import "server-only";

import { cookies,headers } from "next/headers";

import { getPrismaClient } from "@/lib/db/client";
import { AuthAccessDeniedError } from "./errors";
import { getAuth } from "./server";
import { normalizeEmail } from "./utils";

export const ACTIVE_TENANT_COOKIE="flipschedule_active_tenant";
export async function getAuthenticatedSessionContext(requestedTenantSlug?:string) {
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
          acceptedAt: true,
          createdAt: true,
          tenant: { select: { id: true, slug: true, status: true, name: true, timezone: true } },
        },
      },
    },
  });

  if (!user || user.status !== "ACTIVE") throw new AuthAccessDeniedError();
  if (!user.emailVerifiedAt) throw new AuthAccessDeniedError();
  if (user.mustChangePassword) return { firstAccessRequired: true as const, userId: user.id };

  const preference=(await cookies()).get(ACTIVE_TENANT_COOKIE)?.value;
  const eligible=(user.memberships??[]).filter(x=>x.status==="ACTIVE"&&x.tenant.status==="ACTIVE");
  const requested=requestedTenantSlug?eligible.find(x=>x.tenant.slug===requestedTenantSlug):undefined;
  if(requestedTenantSlug&&!requested)throw new AuthAccessDeniedError();
  const preferred=!requested&&preference?eligible.find(x=>x.tenant.slug===preference):undefined;
  const activeMembership=requested??preferred??[...eligible].sort((a,b)=>(a.acceptedAt?.getTime()??a.createdAt.getTime())-(b.acceptedAt?.getTime()??b.createdAt.getTime())||a.tenant.slug.localeCompare(b.tenant.slug))[0];
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
    availableTenants: eligible.map(x=>({membershipId:x.id,tenantSlug:x.tenant.slug,tenantName:x.tenant.name})).sort((a,b)=>a.tenantName.localeCompare(b.tenantName)),
  };
}

export async function getFirstAccessSession() {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;
  const user = await getPrismaClient().user.findUnique({ where: { id: session.user.id }, select: { mustChangePassword: true } });
  return user ? { userId: session.user.id, mustChangePassword: user.mustChangePassword } : null;
}
