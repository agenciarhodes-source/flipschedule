import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext, MembershipRole } from "@/domains/application/context";
import { actionFailure, type ActionResult } from "@/domains/application/actions";
import { hasPermission, type Permission } from "@/domains/application/rbac";
import { getPrismaClient } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth/utils";

const editableRole = z.enum(["MANAGER", "RECEPTIONIST", "PROFESSIONAL", "AGENCY_LEAD", "AGENCY_OPS", "AGENCY_READONLY"]);
const idSchema = z.string().uuid();
const appUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const denied = () => actionFailure("ACCESS_DENIED", "Você não tem permissão para administrar a equipe.");
const tenantWideRole = (role: MembershipRole) => role === "OWNER" || role === "MANAGER";

export class TeamService {
  constructor(private readonly context: ApplicationContext, private readonly prisma: PrismaClient = getPrismaClient()) {}
  private allows(permission: Permission) { return hasPermission(this.context.membershipRole, permission); }
  private audit(tx: Prisma.TransactionClient, action: string, resourceType: string, resourceId: string, metadata?: object) {
    return tx.auditLog.create({ data: { tenantId: this.context.tenantId, actorUserId: this.context.userId, actorMembershipId: this.context.membershipId, action, resourceType, resourceId, outcome: "SUCCESS", ...(metadata ? { metadata } : {}) } });
  }
  async read() {
    if (!this.allows("team.read")) return null;
    const now = new Date();
    const [members, invitations, history] = await Promise.all([
      this.prisma.membership.findMany({ where: { tenantId: this.context.tenantId }, orderBy: { createdAt: "asc" }, select: { id: true, role: true, status: true, acceptedAt: true, createdAt: true, user: { select: { displayName: true, emailNormalized: true } } } }),
      this.prisma.tenantInvitation.findMany({ where: { tenantId: this.context.tenantId }, orderBy: { createdAt: "desc" }, select: { id: true, emailNormalized: true, role: true, expiresAt: true, acceptedAt: true, revokedAt: true, createdAt: true } }),
      this.prisma.auditLog.findMany({ where: { tenantId: this.context.tenantId, resourceType: { in: ["Membership", "TenantInvitation"] } }, take: 50, orderBy: { occurredAt: "desc" }, select: { id: true, action: true, resourceType: true, resourceId: true, occurredAt: true, actorMembershipId: true } }),
    ]);
    return { members, invitations: invitations.map((x) => ({ ...x, state: x.acceptedAt ? "ACCEPTED" : x.revokedAt ? "REVOKED" : x.expiresAt <= now ? "EXPIRED" : "PENDING" as const })), history };
  }
  async invite(input: unknown): Promise<ActionResult<{ id: string; url: string; expiresAt: string }>> {
    if (!this.allows("team.invite")) return denied();
    const parsed = z.object({ email: z.string().trim().email().max(254), role: editableRole, clinicIds: z.array(idSchema).max(100).default([]) }).safeParse(input);
    if (!parsed.success) return actionFailure("VALIDATION_ERROR", "Revise o e-mail, o papel e as unidades informadas.");
    const clinicIds = [...new Set(parsed.data.clinicIds)];
    if (!tenantWideRole(parsed.data.role) && clinicIds.length === 0) return actionFailure("VALIDATION_ERROR", "Selecione ao menos uma unidade para este papel.");
    const emailNormalized = normalizeEmail(parsed.data.email), token = randomBytes(32).toString("base64url"), expiresAt = new Date(Date.now() + 7 * 864e5);
    try {
      const invitation = await this.prisma.$transaction(async (tx) => {
        const [member, pending, clinicCount] = await Promise.all([
          tx.membership.findFirst({ where: { tenantId: this.context.tenantId, user: { emailNormalized }, status: { in: ["ACTIVE", "SUSPENDED"] } }, select: { id: true } }),
          tx.tenantInvitation.findFirst({ where: { tenantId: this.context.tenantId, emailNormalized, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } }),
          tx.clinic.count({ where: { tenantId: this.context.tenantId, status: "ACTIVE", id: { in: clinicIds } } }),
        ]);
        if (member || pending) throw new Error("DUPLICATE");
        if (!tenantWideRole(parsed.data.role) && clinicCount !== clinicIds.length) throw new Error("CLINIC_SCOPE_INVALID");
        const row = await tx.tenantInvitation.create({ data: { tenantId: this.context.tenantId, emailNormalized, role: parsed.data.role, tokenHash: digest(token), expiresAt, invitedByMembershipId: this.context.membershipId }, select: { id: true } });
        if (!tenantWideRole(parsed.data.role)) {
          await tx.tenantInvitationClinicAccess.createMany({ data: clinicIds.map((clinicId) => ({ tenantId: this.context.tenantId, invitationId: row.id, clinicId })), skipDuplicates: true });
        }
        await this.audit(tx, "team.invitation.created", "TenantInvitation", row.id, { role: parsed.data.role, clinicCount: tenantWideRole(parsed.data.role) ? null : clinicIds.length });
        return row;
      }, { isolationLevel: "Serializable" });
      return { ok: true, data: { id: invitation.id, url: `${appUrl}/convite#token=${encodeURIComponent(token)}`, expiresAt: expiresAt.toISOString() } };
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE") return actionFailure("CONFLICT", "Já existe acesso ou convite pendente para este e-mail.");
      if (error instanceof Error && error.message === "CLINIC_SCOPE_INVALID") return actionFailure("VALIDATION_ERROR", "Uma das unidades selecionadas não está disponível.");
      return actionFailure("UNAVAILABLE", "Não foi possível criar o convite.");
    }
  }
  async rotate(id: string) {
    if (!this.allows("team.invite") || !idSchema.safeParse(id).success) return denied();
    const token = randomBytes(32).toString("base64url"), expiresAt = new Date(Date.now() + 7 * 864e5);
    try { const row = await this.prisma.$transaction(async tx => { const current = await tx.tenantInvitation.findFirst({ where: { id, tenantId: this.context.tenantId, acceptedAt: null, revokedAt: null }, select: { id: true } }); if (!current) throw new Error("NOT_FOUND"); await tx.tenantInvitation.update({ where: { id }, data: { tokenHash: digest(token), expiresAt } }); await this.audit(tx,"team.invitation.rotated","TenantInvitation",id); return current; }); return { ok: true as const, data: { id: row.id, url: `${appUrl}/convite#token=${encodeURIComponent(token)}`, expiresAt: expiresAt.toISOString() } }; } catch (error) { return actionFailure(error instanceof Error && error.message === "NOT_FOUND" ? "NOT_FOUND" : "UNAVAILABLE", "Não foi possível rotacionar o convite."); }
  }
  async revokeInvitation(id: string) { return this.invitationMutation(id, "team.revoke", "team.invitation.revoked", { revokedAt: new Date() }); }
  private async invitationMutation(id: string, permission: Permission, action: string, data: { revokedAt: Date }) { if (!this.allows(permission) || !idSchema.safeParse(id).success) return denied(); try { return await this.prisma.$transaction(async tx => { const row=await tx.tenantInvitation.findFirst({where:{id,tenantId:this.context.tenantId,acceptedAt:null,revokedAt:null},select:{id:true}});if(!row)return actionFailure("NOT_FOUND","Convite não encontrado.");await tx.tenantInvitation.update({where:{id},data});await this.audit(tx,action,"TenantInvitation",id);return {ok:true as const,data:{id}};}); } catch { return actionFailure("UNAVAILABLE","Não foi possível revogar o convite."); } }
  async updateRole(id: string, role: unknown) { if (!this.allows("team.update_role")) return denied(); const parsed=editableRole.safeParse(role);if(!parsed.success||!idSchema.safeParse(id).success)return actionFailure("VALIDATION_ERROR","Papel inválido.");return this.changeMember(id,"team.member.role_changed",{role:parsed.data}); }
  async setStatus(id: string, status: "ACTIVE"|"SUSPENDED"|"REVOKED") { const permission=status==="SUSPENDED"?"team.suspend":"team.revoke";if(!this.allows(permission))return denied();return this.changeMember(id,`team.member.${status.toLowerCase()}`,{status}); }
  private async changeMember(id:string,action:string,data:{role?:MembershipRole;status?:"ACTIVE"|"SUSPENDED"|"REVOKED"}) { if(!idSchema.safeParse(id).success)return actionFailure("VALIDATION_ERROR","Membro inválido.");try{return await this.prisma.$transaction(async tx=>{const target=await tx.membership.findFirst({where:{id,tenantId:this.context.tenantId},select:{id:true,role:true,status:true}});if(!target)return actionFailure("NOT_FOUND","Membro não encontrado.");if(target.role==="OWNER"&&(data.role||data.status&&data.status!=="ACTIVE")){const owners=await tx.membership.count({where:{tenantId:this.context.tenantId,role:"OWNER",status:"ACTIVE"}});if(owners<=1)return actionFailure("CONFLICT","A organização deve manter ao menos um proprietário ativo.");}await tx.membership.update({where:{id},data});await this.audit(tx,action,"Membership",id,data);return {ok:true as const,data:{id}};},{isolationLevel:"Serializable"});}catch{return actionFailure("UNAVAILABLE","Não foi possível alterar o membro.");}}
  async transferOwnership(targetId:string,confirmation:unknown){if(!this.allows("team.transfer_ownership"))return denied();const parsed=z.string().trim().safeParse(confirmation);if(!parsed.success||!idSchema.safeParse(targetId).success)return actionFailure("VALIDATION_ERROR","Confirmação inválida.");try{return await this.prisma.$transaction(async tx=>{const tenant=await tx.tenant.findUnique({where:{id:this.context.tenantId},select:{name:true}});if(!tenant||parsed.data!==tenant.name)return actionFailure("VALIDATION_ERROR","Digite exatamente o nome da organização para confirmar.");const target=await tx.membership.findFirst({where:{id:targetId,tenantId:this.context.tenantId,status:"ACTIVE"},select:{id:true}});if(!target||target.id===this.context.membershipId)return actionFailure("CONFLICT","Selecione outro membro ativo.");await tx.membership.update({where:{id:target.id},data:{role:"OWNER"}});await tx.membership.update({where:{id:this.context.membershipId},data:{role:"MANAGER"}});await this.audit(tx,"team.ownership.transferred","Membership",target.id,{previousOwnerMembershipId:this.context.membershipId});return {ok:true as const,data:{id:target.id}};},{isolationLevel:"Serializable"});}catch{return actionFailure("UNAVAILABLE","Não foi possível transferir a propriedade.");}}
}

export class PublicInvitationService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}
  async inspect(token: string) { if (token.length < 32) return null; const row=await this.prisma.tenantInvitation.findFirst({where:{tokenHash:digest(token),acceptedAt:null,revokedAt:null,expiresAt:{gt:new Date()}},select:{emailNormalized:true,role:true,expiresAt:true,tenant:{select:{name:true}}}});if(!row)return null;const [local,domain]=row.emailNormalized.split("@");return {...row,emailMasked:`${local?.slice(0,1)??"*"}***@${domain}`}; }
  async accept(token:string,user:{id:string;email:string}) {
    if(token.length<32)return actionFailure("NOT_FOUND","Convite inválido ou expirado.");
    return this.prisma.$transaction(async tx=>{
      const invite=await tx.tenantInvitation.findFirst({where:{tokenHash:digest(token),acceptedAt:null,revokedAt:null,expiresAt:{gt:new Date()}},select:{id:true,tenantId:true,emailNormalized:true,role:true,tenant:{select:{slug:true}}}});
      if(!invite)return actionFailure("NOT_FOUND","Convite inválido ou expirado.");
      if(normalizeEmail(user.email)!==invite.emailNormalized)return actionFailure("ACCESS_DENIED","Entre com a conta correspondente ao convite.");
      const existing=await tx.membership.findUnique({where:{tenantId_userId:{tenantId:invite.tenantId,userId:user.id}},select:{id:true,status:true}});
      if(existing?.status==="ACTIVE")return actionFailure("CONFLICT","Esta conta já faz parte da organização.");
      const membership=existing?await tx.membership.update({where:{id:existing.id},data:{role:invite.role,status:"ACTIVE",acceptedAt:new Date()}}):await tx.membership.create({data:{tenantId:invite.tenantId,userId:user.id,role:invite.role,status:"ACTIVE",acceptedAt:new Date()},select:{id:true}});
      if(!tenantWideRole(invite.role)) {
        const scopes=await tx.tenantInvitationClinicAccess.findMany({where:{tenantId:invite.tenantId,invitationId:invite.id},select:{clinicId:true}});
        if(scopes.length===0)return actionFailure("CONFLICT","O convite não possui unidades disponíveis. Solicite um novo convite.");
        await tx.membershipClinicAccess.updateMany({where:{tenantId:invite.tenantId,membershipId:membership.id,active:true},data:{active:false}});
        await tx.membershipClinicAccess.createMany({data:scopes.map(({clinicId})=>({tenantId:invite.tenantId,membershipId:membership.id,clinicId,active:true})),skipDuplicates:true});
      }
      await tx.tenantInvitation.update({where:{id:invite.id},data:{acceptedAt:new Date(),acceptedByUserId:user.id}});
      await tx.auditLog.create({data:{tenantId:invite.tenantId,actorUserId:user.id,actorMembershipId:membership.id,action:"team.invitation.accepted",resourceType:"TenantInvitation",resourceId:invite.id,outcome:"SUCCESS",metadata:{clinicScoped:!tenantWideRole(invite.role)}}});
      return {ok:true as const,data:{membershipId:membership.id,tenantSlug:invite.tenant.slug}};
    },{isolationLevel:"Serializable"});
  }
}
