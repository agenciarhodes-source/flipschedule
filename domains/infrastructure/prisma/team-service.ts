import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext, MembershipRole } from "@/domains/application/context";
import { canAccessClinic, parseClinicAccess, serializeClinicAccess } from "@/domains/application/clinic-access";
import { actionFailure, type ActionResult } from "@/domains/application/actions";
import { hasPermission, type Permission } from "@/domains/application/rbac";
import { getPrismaClient } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth/utils";

const editableRole = z.enum(["MANAGER", "RECEPTIONIST", "PROFESSIONAL", "AGENCY_LEAD", "AGENCY_OPS", "AGENCY_READONLY"]);
const idSchema = z.string().uuid();
const appUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const denied = () => actionFailure("ACCESS_DENIED", "Você não tem permissão para administrar a equipe.");
const clinicAccessInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("ALL"), clinicIds: z.array(idSchema).default([]) }),
  z.object({ mode: z.literal("SELECTED"), clinicIds: z.array(idSchema).min(1).max(100) }),
]);

export class TeamService {
  constructor(private readonly context: ApplicationContext, private readonly prisma: PrismaClient = getPrismaClient()) {}
  private allows(permission: Permission) { return hasPermission(this.context.membershipRole, permission); }
  private audit(tx: Prisma.TransactionClient, action: string, resourceType: string, resourceId: string, metadata?: object) {
    return tx.auditLog.create({ data: { tenantId: this.context.tenantId, actorUserId: this.context.userId, actorMembershipId: this.context.membershipId, action, resourceType, resourceId, outcome: "SUCCESS", ...(metadata ? { metadata } : {}) } });
  }

  private async validateClinicAccess(
    tx: Prisma.TransactionClient,
    role: MembershipRole,
    value: unknown,
  ) {
    if (role === "OWNER") return { mode: "ALL" as const };
    const parsed = clinicAccessInput.safeParse(value);
    if (!parsed.success) throw new Error("CLINIC_ACCESS_INVALID");
    if (parsed.data.mode === "ALL") return { mode: "ALL" as const };

    const clinicIds = [...new Set(parsed.data.clinicIds)];
    if (clinicIds.some((clinicId) => !canAccessClinic(this.context, clinicId))) {
      throw new Error("CLINIC_ACCESS_DENIED");
    }
    const count = await tx.clinic.count({
      where: {
        tenantId: this.context.tenantId,
        id: { in: clinicIds },
        status: "ACTIVE",
      },
    });
    if (count !== clinicIds.length) throw new Error("CLINIC_ACCESS_INVALID");
    return { mode: "SELECTED" as const, clinicIds };
  }

  async read() {
    if (!this.allows("team.read")) return null;
    const now = new Date();
    const [members, invitations, history, clinics] = await Promise.all([
      this.prisma.membership.findMany({
        where: { tenantId: this.context.tenantId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          status: true,
          clinicAccess: true,
          acceptedAt: true,
          createdAt: true,
          user: { select: { displayName: true, emailNormalized: true } },
        },
      }),
      this.prisma.tenantInvitation.findMany({
        where: { tenantId: this.context.tenantId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          emailNormalized: true,
          role: true,
          clinicAccess: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          tenantId: this.context.tenantId,
          resourceType: { in: ["Membership", "TenantInvitation"] },
        },
        take: 50,
        orderBy: { occurredAt: "desc" },
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          occurredAt: true,
          actorMembershipId: true,
        },
      }),
      this.prisma.clinic.findMany({
        where: {
          tenantId: this.context.tenantId,
          status: "ACTIVE",
          ...(this.context.clinicAccess.mode === "SELECTED"
            ? { id: { in: [...this.context.clinicAccess.clinicIds] } }
            : {}),
        },
        select: { id: true, name: true, slug: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    ]);
    return {
      members: members.map((member) => ({
        ...member,
        clinicAccess: parseClinicAccess(member.clinicAccess, member.role),
      })),
      invitations: invitations.map((invitation) => ({
        ...invitation,
        clinicAccess: parseClinicAccess(invitation.clinicAccess, invitation.role),
        state: invitation.acceptedAt
          ? "ACCEPTED"
          : invitation.revokedAt
            ? "REVOKED"
            : invitation.expiresAt <= now
              ? "EXPIRED"
              : "PENDING" as const,
      })),
      clinics,
      canManageClinicAccess: this.allows("team.update_clinic_access"),
      history,
    };
  }

  async invite(input: unknown): Promise<ActionResult<{ id: string; url: string; expiresAt: string }>> {
    if (!this.allows("team.invite")) return denied();
    const parsed = z.object({
      email: z.string().trim().email().max(254),
      role: editableRole,
      clinicAccess: clinicAccessInput,
    }).safeParse(input);
    if (!parsed.success) return actionFailure("VALIDATION_ERROR", "Revise o e-mail, o papel e as unidades informadas.");
    const emailNormalized = normalizeEmail(parsed.data.email);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 864e5);
    try {
      const invitation = await this.prisma.$transaction(async (tx) => {
        const [member, pending] = await Promise.all([
          tx.membership.findFirst({
            where: {
              tenantId: this.context.tenantId,
              user: { emailNormalized },
              status: { in: ["ACTIVE", "SUSPENDED"] },
            },
            select: { id: true },
          }),
          tx.tenantInvitation.findFirst({
            where: {
              tenantId: this.context.tenantId,
              emailNormalized,
              acceptedAt: null,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
            select: { id: true },
          }),
        ]);
        if (member || pending) throw new Error("DUPLICATE");
        const access = await this.validateClinicAccess(tx, parsed.data.role, parsed.data.clinicAccess);
        const row = await tx.tenantInvitation.create({
          data: {
            tenantId: this.context.tenantId,
            emailNormalized,
            role: parsed.data.role,
            clinicAccess: serializeClinicAccess(access),
            tokenHash: digest(token),
            expiresAt,
            invitedByMembershipId: this.context.membershipId,
          },
          select: { id: true },
        });
        await this.audit(tx, "team.invitation.created", "TenantInvitation", row.id, {
          role: parsed.data.role,
          clinicAccessMode: access.mode,
          clinicCount: access.mode === "SELECTED" ? access.clinicIds.length : null,
        });
        return row;
      }, { isolationLevel: "Serializable" });
      return {
        ok: true,
        data: {
          id: invitation.id,
          url: `${appUrl}/convite#token=${encodeURIComponent(token)}`,
          expiresAt: expiresAt.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE") {
        return actionFailure("CONFLICT", "Já existe acesso ou convite pendente para este e-mail.");
      }
      if (error instanceof Error && error.message.startsWith("CLINIC_ACCESS_")) {
        return actionFailure("ACCESS_DENIED", "Revise as unidades que podem ser concedidas a este usuário.");
      }
      return actionFailure("UNAVAILABLE", "Não foi possível criar o convite.");
    }
  }

  async rotate(id: string) {
    if (!this.allows("team.invite") || !idSchema.safeParse(id).success) return denied();
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 864e5);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const current = await tx.tenantInvitation.findFirst({
          where: { id, tenantId: this.context.tenantId, acceptedAt: null, revokedAt: null },
          select: { id: true },
        });
        if (!current) throw new Error("NOT_FOUND");
        await tx.tenantInvitation.update({ where: { id }, data: { tokenHash: digest(token), expiresAt } });
        await this.audit(tx, "team.invitation.rotated", "TenantInvitation", id);
        return current;
      });
      return {
        ok: true as const,
        data: {
          id: row.id,
          url: `${appUrl}/convite#token=${encodeURIComponent(token)}`,
          expiresAt: expiresAt.toISOString(),
        },
      };
    } catch (error) {
      return actionFailure(error instanceof Error && error.message === "NOT_FOUND" ? "NOT_FOUND" : "UNAVAILABLE", "Não foi possível rotacionar o convite.");
    }
  }

  async revokeInvitation(id: string) {
    return this.invitationMutation(id, "team.revoke", "team.invitation.revoked", { revokedAt: new Date() });
  }

  private async invitationMutation(id: string, permission: Permission, action: string, data: { revokedAt: Date }) {
    if (!this.allows(permission) || !idSchema.safeParse(id).success) return denied();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.tenantInvitation.findFirst({
          where: { id, tenantId: this.context.tenantId, acceptedAt: null, revokedAt: null },
          select: { id: true },
        });
        if (!row) return actionFailure("NOT_FOUND", "Convite não encontrado.");
        await tx.tenantInvitation.update({ where: { id }, data });
        await this.audit(tx, action, "TenantInvitation", id);
        return { ok: true as const, data: { id } };
      });
    } catch {
      return actionFailure("UNAVAILABLE", "Não foi possível revogar o convite.");
    }
  }

  async updateRole(id: string, role: unknown) {
    if (!this.allows("team.update_role")) return denied();
    const parsed = editableRole.safeParse(role);
    if (!parsed.success || !idSchema.safeParse(id).success) return actionFailure("VALIDATION_ERROR", "Papel inválido.");
    return this.changeMember(id, "team.member.role_changed", { role: parsed.data });
  }

  async updateClinicAccess(id: string, input: unknown) {
    if (!this.allows("team.update_clinic_access") || !idSchema.safeParse(id).success) return denied();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const target = await tx.membership.findFirst({
          where: { id, tenantId: this.context.tenantId },
          select: { id: true, role: true },
        });
        if (!target) return actionFailure("NOT_FOUND", "Membro não encontrado.");
        if (target.role === "OWNER") {
          return actionFailure("CONFLICT", "O proprietário sempre precisa ter acesso a todas as unidades.");
        }
        const access = await this.validateClinicAccess(tx, target.role, input);
        await tx.membership.update({
          where: { id },
          data: { clinicAccess: serializeClinicAccess(access) },
        });
        await this.audit(tx, "team.member.clinic_access_changed", "Membership", id, {
          clinicAccessMode: access.mode,
          clinicCount: access.mode === "SELECTED" ? access.clinicIds.length : null,
        });
        return { ok: true as const, data: { id } };
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("CLINIC_ACCESS_")) {
        return actionFailure("ACCESS_DENIED", "Você não pode conceder acesso a essas unidades.");
      }
      return actionFailure("UNAVAILABLE", "Não foi possível alterar as unidades do membro.");
    }
  }

  async setStatus(id: string, status: "ACTIVE"|"SUSPENDED"|"REVOKED") {
    const permission = status === "SUSPENDED" ? "team.suspend" : "team.revoke";
    if (!this.allows(permission)) return denied();
    return this.changeMember(id, `team.member.${status.toLowerCase()}`, { status });
  }

  private async changeMember(id:string, action:string, data:{role?:MembershipRole;status?:"ACTIVE"|"SUSPENDED"|"REVOKED"}) {
    if (!idSchema.safeParse(id).success) return actionFailure("VALIDATION_ERROR", "Membro inválido.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const target = await tx.membership.findFirst({
          where: { id, tenantId: this.context.tenantId },
          select: { id: true, role: true, status: true },
        });
        if (!target) return actionFailure("NOT_FOUND", "Membro não encontrado.");
        if (target.role === "OWNER" && (data.role || data.status && data.status !== "ACTIVE")) {
          const owners = await tx.membership.count({
            where: { tenantId: this.context.tenantId, role: "OWNER", status: "ACTIVE" },
          });
          if (owners <= 1) return actionFailure("CONFLICT", "A organização deve manter ao menos um proprietário ativo.");
        }
        await tx.membership.update({ where: { id }, data });
        await this.audit(tx, action, "Membership", id, data);
        return { ok: true as const, data: { id } };
      }, { isolationLevel: "Serializable" });
    } catch {
      return actionFailure("UNAVAILABLE", "Não foi possível alterar o membro.");
    }
  }

  async transferOwnership(targetId:string, confirmation:unknown) {
    if (!this.allows("team.transfer_ownership")) return denied();
    const parsed = z.string().trim().safeParse(confirmation);
    if (!parsed.success || !idSchema.safeParse(targetId).success) return actionFailure("VALIDATION_ERROR", "Confirmação inválida.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.findUnique({ where: { id: this.context.tenantId }, select: { name: true } });
        if (!tenant || parsed.data !== tenant.name) return actionFailure("VALIDATION_ERROR", "Digite exatamente o nome da organização para confirmar.");
        const target = await tx.membership.findFirst({
          where: { id: targetId, tenantId: this.context.tenantId, status: "ACTIVE" },
          select: { id: true },
        });
        if (!target || target.id === this.context.membershipId) return actionFailure("CONFLICT", "Selecione outro membro ativo.");
        await tx.membership.update({
          where: { id: target.id },
          data: { role: "OWNER", clinicAccess: { mode: "ALL" } },
        });
        await tx.membership.update({
          where: { id: this.context.membershipId },
          data: { role: "MANAGER", clinicAccess: { mode: "ALL" } },
        });
        await this.audit(tx, "team.ownership.transferred", "Membership", target.id, {
          previousOwnerMembershipId: this.context.membershipId,
        });
        return { ok: true as const, data: { id: target.id } };
      }, { isolationLevel: "Serializable" });
    } catch {
      return actionFailure("UNAVAILABLE", "Não foi possível transferir a propriedade.");
    }
  }
}

export class PublicInvitationService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async inspect(token: string) {
    if (token.length < 32) return null;
    const row = await this.prisma.tenantInvitation.findFirst({
      where: { tokenHash: digest(token), acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        emailNormalized: true,
        role: true,
        clinicAccess: true,
        expiresAt: true,
        tenant: { select: { name: true } },
      },
    });
    if (!row) return null;
    const [local,domain] = row.emailNormalized.split("@");
    return {
      ...row,
      clinicAccess: parseClinicAccess(row.clinicAccess, row.role),
      emailMasked: `${local?.slice(0,1)??"*"}***@${domain}`,
    };
  }

  async accept(token:string, user:{id:string;email:string}) {
    if (token.length < 32) return actionFailure("NOT_FOUND", "Convite inválido ou expirado.");
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.tenantInvitation.findFirst({
        where: { tokenHash: digest(token), acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        select: {
          id: true,
          tenantId: true,
          emailNormalized: true,
          role: true,
          clinicAccess: true,
          tenant: { select: { slug: true } },
        },
      });
      if (!invite) return actionFailure("NOT_FOUND", "Convite inválido ou expirado.");
      if (normalizeEmail(user.email) !== invite.emailNormalized) return actionFailure("ACCESS_DENIED", "Entre com a conta correspondente ao convite.");
      const existing = await tx.membership.findUnique({
        where: { tenantId_userId: { tenantId: invite.tenantId, userId: user.id } },
        select: { id: true, status: true },
      });
      if (existing?.status === "ACTIVE") return actionFailure("CONFLICT", "Esta conta já faz parte da organização.");
      const membership = existing
        ? await tx.membership.update({
            where: { id: existing.id },
            data: {
              role: invite.role,
              status: "ACTIVE",
              clinicAccess: invite.clinicAccess ?? { mode: "ALL" },
              acceptedAt: new Date(),
            },
          })
        : await tx.membership.create({
            data: {
              tenantId: invite.tenantId,
              userId: user.id,
              role: invite.role,
              status: "ACTIVE",
              clinicAccess: invite.clinicAccess ?? { mode: "ALL" },
              acceptedAt: new Date(),
            },
            select: { id: true },
          });
      await tx.tenantInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), acceptedByUserId: user.id },
      });
      await tx.auditLog.create({
        data: {
          tenantId: invite.tenantId,
          actorUserId: user.id,
          actorMembershipId: membership.id,
          action: "team.invitation.accepted",
          resourceType: "TenantInvitation",
          resourceId: invite.id,
          outcome: "SUCCESS",
        },
      });
      return { ok: true as const, data: { membershipId: membership.id, tenantSlug: invite.tenant.slug } };
    }, { isolationLevel: "Serializable" });
  }
}
