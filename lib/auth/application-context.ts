import "server-only";
import type { ApplicationContext } from "@/domains/application/context";
import { requireAuthenticatedTenantContext } from "./guards";
export async function getApplicationContext(requestedTenantSlug?:string): Promise<ApplicationContext> {
  const context = await requireAuthenticatedTenantContext(requestedTenantSlug);
  return { userId: context.userId, membershipId: context.membershipId, membershipRole: context.membershipRole, tenantId: context.tenantId, tenantSlug: context.tenantSlug, tenantTimezone: context.tenantTimezone, displayName: context.displayName, email: context.email, clinicAccess: context.clinicAccess };
}
