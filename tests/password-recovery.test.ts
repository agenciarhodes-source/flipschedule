/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));

const store = vi.hoisted(() => ({ users: new Map<string, any>(), tokens: [] as any[], accounts: new Map<string, any>(), sessions: [] as any[], buckets: new Map<string, any>(), audits: [] as any[], delivery: null as any }));

vi.mock("@/lib/runtime/config", () => ({ getPublicApplicationOrigin: () => new URL("https://app.example.test"), requireRuntimeSecretReference: () => "x".repeat(40) }));
vi.mock("better-auth/crypto", () => ({ hashPassword: vi.fn(async (p: string) => `hash:${p}`), verifyPassword: vi.fn(async ({ hash, password }) => hash === `hash:${password}`) }));
vi.mock("@/lib/db/client", () => ({ getPrismaClient: () => prisma }));

const prisma: any = {
  user: { findUnique: vi.fn(async ({ where }: any) => store.users.get(where.emailNormalized) ?? store.users.get(where.id) ?? null), update: vi.fn(async ({ where, data }: any) => Object.assign([...store.users.values()].find(u=>u.id===where.id), data)) },
  authAccount: { update: vi.fn(async ({ where, data }: any) => Object.assign(store.accounts.get(where.providerId_accountId.accountId), data)) },
  authSession: { deleteMany: vi.fn(async ({ where }: any) => { const before=store.sessions.length; store.sessions=store.sessions.filter(s=>s.userId!==where.userId); return { count: before-store.sessions.length }; }) },
  auditLog: { create: vi.fn(async ({ data }: any) => { store.audits.push(data); return data; }) },
  securityRateLimitBucket: { findFirst: vi.fn(async()=>null), upsert: vi.fn(async({ where, create, update }: any)=>{ const key=JSON.stringify(where.scope_keyHash_windowStartedAt); const row=store.buckets.get(key)??{...create,count:0}; row.count += update?.count?.increment ?? 1; store.buckets.set(key,row); return row; }), updateMany: vi.fn(async()=>({count:1})), findMany: vi.fn(async()=>[]), deleteMany: vi.fn(async()=>({count:0})) },
  passwordResetToken: {
    create: vi.fn(async ({ data }: any) => { const row={ id:`prt-${store.tokens.length+1}`,...data, createdAt:new Date(), updatedAt:new Date()}; store.tokens.push(row); return row; }),
    updateMany: vi.fn(async ({ where, data }: any) => { let count=0; for (const t of store.tokens) { if (where.id && t.id!==where.id) continue; if (where.id?.not && t.id===where.id.not) continue; if (where.userId && t.userId!==where.userId) continue; if (where.tokenHash && t.tokenHash!==where.tokenHash) continue; if (where.purpose && t.purpose!==where.purpose) continue; if (where.consumedAt===null && t.consumedAt) continue; if (where.revokedAt===null && t.revokedAt) continue; if (where.expiresAt?.gt && !(t.expiresAt>where.expiresAt.gt)) continue; Object.assign(t,data); count++; } return { count }; }),
    findUnique: vi.fn(async ({ where }: any) => { const t=store.tokens.find(x=>x.tokenHash===where.tokenHash); return t ? { ...t, user: [...store.users.values()].find(u=>u.id===t.userId) } : null; }),
    deleteMany: vi.fn(async()=>({count:0}))
  },
  $transaction: vi.fn(async (fn: any) => fn(prisma))
};

describe("password recovery", () => {
  beforeEach(async () => { store.users.clear(); store.tokens=[]; store.accounts.clear(); store.sessions=[]; store.buckets.clear(); store.audits=[]; vi.clearAllMocks(); const { setPasswordResetDeliveryForTesting } = await import("@/lib/auth/password-recovery/delivery"); setPasswordResetDeliveryForTesting({ sendPasswordReset: vi.fn(async (input:any)=>{ store.delivery=input; }) }); });
  it("normaliza e-mail, retorna resposta genérica e persiste apenas hash", async () => { const { requestPasswordReset, PASSWORD_RESET_PUBLIC_MESSAGE } = await import("@/lib/auth/password-recovery/service"); store.users.set("owner@example.test", { id:"u1", emailNormalized:"owner@example.test", status:"ACTIVE" }); const result=await requestPasswordReset({ email:"  OWNER@EXAMPLE.TEST " }, { ip:"127.0.0.1" }); expect(result.message).toBe(PASSWORD_RESET_PUBLIC_MESSAGE); expect(store.tokens).toHaveLength(1); expect(store.delivery.resetUrl).toContain("/reset-password?token="); expect(store.tokens[0].tokenHash).not.toContain(new URL(store.delivery.resetUrl).searchParams.get("token")!); });
  it("mantém resposta equivalente para conta inexistente e não gera token", async () => { const { requestPasswordReset } = await import("@/lib/auth/password-recovery/service"); const a=await requestPasswordReset({ email:"missing@example.test" }, { ip:"127.0.0.1" }); const b=await requestPasswordReset({ email:"other@example.test" }, { ip:"127.0.0.1" }); expect(a).toEqual(b); expect(store.tokens).toHaveLength(0); });
  it("revoga token recém-criado quando entrega falha", async () => { const { setPasswordResetDeliveryForTesting } = await import("@/lib/auth/password-recovery/delivery"); setPasswordResetDeliveryForTesting({ sendPasswordReset: vi.fn(async()=>{ throw new Error("down"); }) }); const { requestPasswordReset } = await import("@/lib/auth/password-recovery/service"); store.users.set("owner@example.test", { id:"u1", emailNormalized:"owner@example.test", status:"ACTIVE" }); await requestPasswordReset({ email:"owner@example.test" }, { ip:"127.0.0.1" }); expect(store.tokens[0].revokedAt).toBeInstanceOf(Date); });
  it("consome token uma única vez, altera senha e revoga sessões", async () => { const { requestPasswordReset, resetPassword } = await import("@/lib/auth/password-recovery/service"); store.users.set("owner@example.test", { id:"u1", emailNormalized:"owner@example.test", status:"ACTIVE", mustChangePassword:true }); store.accounts.set("u1", { password:"hash:OldPass!12345" }); store.sessions.push({id:"s1",userId:"u1"}); await requestPasswordReset({ email:"owner@example.test" }, { ip:"127.0.0.1" }); const raw=new URL(store.delivery.resetUrl).searchParams.get("token")!; await expect(resetPassword({ token:raw, newPassword:"NewPass!12345", confirmation:"NewPass!12345" }, { ip:"127.0.0.1" })).resolves.toMatchObject({ ok:true }); await expect(resetPassword({ token:raw, newPassword:"OtherPass!12345", confirmation:"OtherPass!12345" }, { ip:"127.0.0.1" })).resolves.toMatchObject({ ok:false }); expect(store.accounts.get("u1").password).toBe("hash:NewPass!12345"); expect(store.sessions).toHaveLength(0); expect([...store.users.values()][0].mustChangePassword).toBe(false); });
});
