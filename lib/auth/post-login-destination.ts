import "server-only";

import { headers } from "next/headers";

import { getPrismaClient } from "@/lib/db/client";
import { AuthAccessDeniedError } from "./errors";
import { buildTenantDashboardPath } from "./post-login";
import { getAuth } from "./server";
import { getAuthenticatedSessionContext } from "./session";

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

export async function resolvePostLoginDestination() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return "/login";

  const operator = await getPrismaClient().platformOperator.findUnique({
    where: { userId: session.user.id },
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
    const context = await getAuthenticatedSessionContext();
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
