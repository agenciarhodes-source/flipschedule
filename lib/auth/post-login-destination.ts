import "server-only";

import { cookies, headers } from "next/headers";

import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/client";
import { AuthAccessDeniedError } from "./errors";
import { buildTenantDashboardPath } from "./post-login";
import { getAuth } from "./server";
import { ACTIVE_TENANT_COOKIE } from "./session";
import { resolveAuthenticatedUserContext } from "./session-resolution";

export type PostLoginDestinationInput = {
  hasActivePlatformAccess: boolean;
  firstAccessRequired?: boolean;
  tenantSlug?: string;
};

export function selectPostLoginDestination(input: PostLoginDestinationInput) {
  if (input.hasActivePlatformAccess) return "/admin";
  if (input.firstAccessRequired) return "/first-access";
  if (input.tenantSlug) return buildTenantDashboardPath(input.tenantSlug);
  return "/access-pending";
}

export async function resolvePostLoginDestinationForUser(
  database: PrismaClient,
  userId: string,
  preferredTenantSlug?: string,
) {
  const operator = await database.platformOperator.findUnique({
    where: { userId },
    select: {
      status: true,
      user: {
        select: {
          status: true,
          emailVerified: true,
          emailVerifiedAt: true,
        },
      },
    },
  });
  const hasActivePlatformAccess = Boolean(
    operator &&
      operator.status === "ACTIVE" &&
      operator.user.status === "ACTIVE" &&
      (operator.user.emailVerified || operator.user.emailVerifiedAt),
  );
  if (hasActivePlatformAccess) {
    return selectPostLoginDestination({ hasActivePlatformAccess: true });
  }

  try {
    const context = await resolveAuthenticatedUserContext(
      database,
      userId,
      undefined,
      preferredTenantSlug,
    );
    return selectPostLoginDestination({
      hasActivePlatformAccess: false,
      firstAccessRequired: context.firstAccessRequired,
      ...(!context.firstAccessRequired ? { tenantSlug: context.tenantSlug } : {}),
    });
  } catch (error) {
    if (error instanceof AuthAccessDeniedError) {
      return selectPostLoginDestination({ hasActivePlatformAccess: false });
    }
    throw error;
  }
}

export async function resolvePostLoginDestination() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return "/login";

  const preferredTenantSlug = (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value;
  return resolvePostLoginDestinationForUser(
    getPrismaClient(),
    session.user.id,
    preferredTenantSlug,
  );
}
