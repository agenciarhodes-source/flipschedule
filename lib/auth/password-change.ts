import "server-only";

import { hashPassword } from "better-auth/crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function applyProvenPasswordChange(tx: Tx, userId: string, newPassword: string, now = new Date()) {
  const password = await hashPassword(newPassword);
  await tx.authAccount.update({ where: { providerId_accountId: { providerId: "credential", accountId: userId } }, data: { password } });
  await tx.user.update({ where: { id: userId }, data: { mustChangePassword: false, passwordChangedAt: now, firstAccessCompletedAt: now } });
}

export async function revokeUserSessions(tx: Tx, userId: string) {
  return tx.authSession.deleteMany({ where: { userId } });
}
