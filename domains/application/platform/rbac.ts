import type { PlatformOperatorRole } from "@/generated/prisma/client";

export const platformPermissions = [
  "platform.dashboard.read", "platform.tenants.read", "platform.tenants.manage_status",
  "platform.users.read", "platform.users.manage_status", "platform.sessions.revoke",
  "platform.subscriptions.read", "platform.entitlements.manage", "platform.operations.read",
  "platform.operations.retry", "platform.audit.read", "platform.support.read",
  "platform.support.grant", "platform.operators.read", "platform.operators.manage",
] as const;
export type PlatformPermission = (typeof platformPermissions)[number];
const read: PlatformPermission[] = ["platform.dashboard.read","platform.tenants.read","platform.users.read","platform.subscriptions.read","platform.operations.read","platform.audit.read","platform.support.read","platform.operators.read"];
const matrix: Record<PlatformOperatorRole, ReadonlySet<PlatformPermission>> = {
  PLATFORM_OWNER: new Set(platformPermissions),
  PLATFORM_ADMIN: new Set([...read,"platform.tenants.manage_status","platform.users.manage_status","platform.sessions.revoke","platform.operations.retry","platform.support.grant","platform.operators.manage"]),
  SUPPORT: new Set(["platform.dashboard.read","platform.tenants.read","platform.users.read","platform.operations.read","platform.support.read","platform.support.grant"]),
  BILLING: new Set(["platform.dashboard.read","platform.tenants.read","platform.subscriptions.read","platform.entitlements.manage","platform.operations.read","platform.operations.retry","platform.audit.read"]),
  READONLY: new Set(read),
};
export const hasPlatformPermission=(role:PlatformOperatorRole,permission:PlatformPermission)=>matrix[role].has(permission);
export function requirePlatformPermission(role:PlatformOperatorRole,permission:PlatformPermission){if(!hasPlatformPermission(role,permission))throw new Error("PLATFORM_ACCESS_DENIED")}
export function canManagePlatformOperator(actor:PlatformOperatorRole,target:PlatformOperatorRole,nextRole?:PlatformOperatorRole){
  if(actor==="PLATFORM_OWNER")return true;
  return actor==="PLATFORM_ADMIN"&&target!=="PLATFORM_OWNER"&&nextRole!=="PLATFORM_OWNER";
}
export function ensureLastPlatformOwner(input:{targetRole:PlatformOperatorRole;targetStatus:string;nextRole?:PlatformOperatorRole;nextStatus?:string;activeOwnerCount:number}){
  const removes=input.targetRole==="PLATFORM_OWNER"&&input.targetStatus==="ACTIVE"&&(input.nextRole&&input.nextRole!=="PLATFORM_OWNER"||input.nextStatus&&input.nextStatus!=="ACTIVE");
  if(removes&&input.activeOwnerCount<=1)throw new Error("LAST_PLATFORM_OWNER_REQUIRED");
}
