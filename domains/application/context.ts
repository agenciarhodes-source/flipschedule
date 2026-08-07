import type { ClinicAccess } from "./clinic-access";

export type MembershipRole = "OWNER" | "MANAGER" | "RECEPTIONIST" | "PROFESSIONAL" | "AGENCY_LEAD" | "AGENCY_OPS" | "AGENCY_READONLY";

/** Trusted, server-derived identity used by application services and adapters. */
export interface ApplicationContext {
  userId: string;
  membershipId: string;
  membershipRole: MembershipRole;
  tenantId: string;
  tenantSlug: string;
  tenantTimezone: string;
  displayName: string;
  email: string;
  clinicAccess: ClinicAccess;
}

export type AuthenticatedUserSummary = Pick<ApplicationContext, "displayName" | "email">;
