import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

type SignInPolicyDatabase = Pick<PrismaClient, "user">;

export async function canUserCreateSession(
  database: SignInPolicyDatabase,
  userId: string,
) {
  const user = await database.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  return user?.status === "ACTIVE";
}
