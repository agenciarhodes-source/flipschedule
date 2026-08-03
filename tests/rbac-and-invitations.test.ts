import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
import { hasPermission,permissions } from "@/domains/application/rbac";
describe("definitive tenant RBAC",()=>{
 it("denies sensitive team mutations unless the membership is OWNER",()=>{for(const role of ["MANAGER","RECEPTIONIST","PROFESSIONAL","AGENCY_LEAD","AGENCY_OPS","AGENCY_READONLY"] as const)expect(hasPermission(role,"team.transfer_ownership")).toBe(false);expect(hasPermission("OWNER","team.transfer_ownership")).toBe(true)});
 it("declares each permission once and gives readonly agency no writes",()=>{expect(new Set(permissions).size).toBe(permissions.length);expect(hasPermission("AGENCY_READONLY","crm.manage")).toBe(false);expect(hasPermission("AGENCY_READONLY","reports.read_global")).toBe(true)});
});
describe("secure invitation persistence contract",()=>{const schema=readFileSync("prisma/schema.prisma","utf8"),invitationModel=schema.split("model TenantInvitation {")[1]?.split("\n}")[0]??"",service=readFileSync("domains/infrastructure/prisma/team-service.ts","utf8");it("stores a unique digest instead of a raw invitation token",()=>{expect(invitationModel).toContain("tokenHash");expect(invitationModel).not.toMatch(/\n\s+token\s+String/);expect(service).toContain('createHash("sha256")')});it("scopes team records and preserves an active owner",()=>{expect(service).toContain("tenantId: this.context.tenantId");expect(service).toContain("owners<=1")});it("does not claim or perform email delivery",()=>{expect(service).not.toMatch(/send(Mail|Email)|nodemailer|resend/i)})});
