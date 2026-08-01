import "server-only";

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/client";
import { passwordSchema } from "./password-policy";

export const firstAccessSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
  confirmation: z.string(),
}).refine((value) => value.newPassword === value.confirmation, { path: ["confirmation"] })
  .refine((value) => value.currentPassword !== value.newPassword, { path: ["newPassword"] });

export async function completeFirstAccess(userId: string, currentSessionId: string, input: z.input<typeof firstAccessSchema>) {
  const data = firstAccessSchema.parse(input);
  const prisma = getPrismaClient();
  const account = await prisma.authAccount.findUnique({ where: { providerId_accountId: { providerId: "credential", accountId: userId } } });
  if (!account?.password || !(await verifyPassword({ hash: account.password, password: data.currentPassword }))) throw new Error("FIRST_ACCESS_DENIED");
  if (await verifyPassword({ hash: account.password, password: data.newPassword })) throw new Error("FIRST_ACCESS_DENIED");
  const password = await hashPassword(data.newPassword);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, include: { memberships: { where: { status: "ACTIVE" }, take: 1 } } });
    if (!user?.mustChangePassword || !user.memberships[0]) throw new Error("FIRST_ACCESS_DENIED");
    await tx.authAccount.update({ where: { id: account.id }, data: { password } });
    await tx.user.update({ where: { id: userId }, data: { mustChangePassword: false, passwordChangedAt: now, firstAccessCompletedAt: now } });
    await tx.authSession.deleteMany({ where: { userId, id: { not: currentSessionId } } });
    await tx.auditLog.create({ data: { tenantId: user.memberships[0].tenantId, actorUserId: userId, actorMembershipId: user.memberships[0].id, action: "identity.first_access.completed", resourceType: "User", resourceId: userId, outcome: "SUCCESS" } });
  });
}
