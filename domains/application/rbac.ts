import type { MembershipRole } from "./context";

export const permissions = [
  "organization.read", "organization.update", "team.read", "team.invite", "team.update_role", "team.update_clinic_access", "team.suspend", "team.revoke", "team.transfer_ownership",
  "clinics.read", "clinics.manage", "professionals.read", "professionals.manage", "procedures.read", "procedures.manage", "schedule.read_all", "schedule.read_own", "schedule.manage",
  "patients.read_all", "patients.read_assigned", "patients.manage", "crm.read", "crm.manage", "treatment_plans.read_all", "treatment_plans.read_own", "treatment_plans.manage",
  "inbox.read", "inbox.manage", "reports.read_global", "reports.read_own", "reports.export", "integrations.read", "integrations.manage", "subscription.read", "subscription.manage", "billing.checkout", "billing.cancel", "billing.reconcile", "audit.read",
] as const;
export type Permission = (typeof permissions)[number];

const operational: Permission[] = ["organization.read","clinics.read","clinics.manage","professionals.read","professionals.manage","procedures.read","procedures.manage","schedule.read_all","schedule.manage","patients.read_all","patients.manage","crm.read","crm.manage","treatment_plans.read_all","treatment_plans.manage","inbox.read","inbox.manage","reports.read_global","reports.export","integrations.read","subscription.read"];
const matrix: Record<MembershipRole, ReadonlySet<Permission>> = {
  OWNER: new Set(permissions),
  MANAGER: new Set([...operational,"team.read","team.update_clinic_access","audit.read","organization.update","integrations.manage"]),
  RECEPTIONIST: new Set(["organization.read","clinics.read","professionals.read","procedures.read","schedule.read_all","schedule.manage","patients.read_all","patients.manage","crm.read","crm.manage","treatment_plans.read_all","treatment_plans.manage","inbox.read","inbox.manage"]),
  PROFESSIONAL: new Set(["organization.read","clinics.read","professionals.read","procedures.read","schedule.read_own","patients.read_assigned","treatment_plans.read_own","treatment_plans.manage","inbox.read","reports.read_own"]),
  AGENCY_LEAD: new Set(["organization.read","clinics.read","professionals.read","procedures.read","crm.read","crm.manage","patients.read_all","reports.read_global"]),
  AGENCY_OPS: new Set(["organization.read","clinics.read","professionals.read","procedures.read","crm.read","patients.read_all","inbox.read","reports.read_global"]),
  AGENCY_READONLY: new Set(["organization.read","clinics.read","professionals.read","procedures.read","crm.read","reports.read_global"]),
};
export const hasPermission = (role: MembershipRole, permission: Permission) => matrix[role].has(permission);
export function requirePermission(role: MembershipRole, permission: Permission) { if (!hasPermission(role, permission)) throw new Error("ACCESS_DENIED"); }
