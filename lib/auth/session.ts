import "server-only";

import { cookies, headers } from "next/headers";

import { getPrismaClient } from "@/lib/db/client";
import { AuthAccessDeniedError } from "./errors";
import { resolveAuthenticatedUserContext } from "./session-resolution";
import { getAuth } from "./server";

export const ACTIVE_TENANT_COOKIE = "flipschedule_active_tenant";

export async function getAuthenticatedSessionContext(requestedTenantSlug?: string) {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session?.user) throw new AuthAccessDeniedError();

  const preference = (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value;
  return resolveAuthenticatedUserContext(
    getPrismaClient(),
    session.user.id,
    requestedTenantSlug,
    preference,
  );
}

export async function getFirstAccessSession() {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;

  const user = await getPrismaClient().user.findUnique({
    where: { id: session.user.id },
    select: {
      mustChangePassword: true,
      status: true,
      emailVerified: true,
      emailVerifiedAt: true,
      platformOperator: { select: { status: true } },
    },
  });
  if (!user) return null;

  const hasActivePlatformAccess = Boolean(
    user.platformOperator?.status === "ACTIVE" &&
      user.status === "ACTIVE" &&
      (user.emailVerified || user.emailVerifiedAt),
  );

  return {
    userId: session.user.id,
    mustChangePassword: hasActivePlatformAccess ? false : user.mustChangePassword,
    destination: hasActivePlatformAccess ? "/admin" : "/dashboard",
  };
}
