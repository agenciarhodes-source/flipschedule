import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { normalizeEmail } from "./utils";

type SignInPolicyDatabase = Pick<PrismaClient, "user">;

export async function canUserSignIn(
  database: SignInPolicyDatabase,
  email: string,
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return true;

  const user = await database.user.findUnique({
    where: { emailNormalized: normalizedEmail },
    select: { status: true },
  });

  // Unknown accounts continue through Better Auth so the public response
  // remains indistinguishable from an invalid password.
  return !user || user.status === "ACTIVE";
}
