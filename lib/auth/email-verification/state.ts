import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { structuredLog } from "@/lib/observability/logger";

export type PersistEmailVerifiedAtInput = {
  database: Pick<PrismaClient, "user">;
  user: {
    id: string;
    emailVerified: boolean;
  };
  contextPath?: string;
  verifiedAt?: Date;
};

export async function persistEmailVerifiedAt(input: PersistEmailVerifiedAtInput) {
  if (input.contextPath !== "/verify-email" || !input.user.emailVerified) {
    return false;
  }

  const result = await input.database.user.updateMany({
    where: {
      id: input.user.id,
      emailVerified: true,
      emailVerifiedAt: null,
    },
    data: {
      emailVerifiedAt: input.verifiedAt ?? new Date(),
    },
  });

  if (result.count === 0) {
    return false;
  }

  structuredLog("info", "auth.email_verification.completed", {
    resourceType: "User",
    resourceId: input.user.id,
    status: "SUCCESS",
  });

  return true;
}
