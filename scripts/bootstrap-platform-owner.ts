import { z } from "zod";

import { getPrismaClient } from "../lib/db";
import { normalizeEmail } from "../lib/auth/utils";

// Operational validation trigger for the isolated production-owner promotion PR.
const schema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
  confirmation: z.literal("BOOTSTRAP_PLATFORM_OWNER"),
});

export async function bootstrapPlatformOwner(
  input: unknown,
  prisma = getPrismaClient(),
) {
  const data = schema.parse(input);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(350048)`;

    const user = await tx.user.findUnique({
      where: { emailNormalized: data.email },
      select: {
        id: true,
        status: true,
        emailVerified: true,
        emailVerifiedAt: true,
        firstAccessCompletedAt: true,
        platformOperator: {
          select: { id: true, role: true, status: true },
        },
      },
    });

    if (
      !user ||
      user.status !== "ACTIVE" ||
      (!user.emailVerified && !user.emailVerifiedAt)
    ) {
      throw new Error("PLATFORM_OWNER_BOOTSTRAP_DENIED");
    }

    if (
      user.platformOperator &&
      (user.platformOperator.role !== "PLATFORM_OWNER" ||
        user.platformOperator.status !== "ACTIVE")
    ) {
      throw new Error("PLATFORM_OWNER_BOOTSTRAP_CONFLICT");
    }

    const now = new Date();
    const operator = user.platformOperator
      ? user.platformOperator
      : await tx.platformOperator.create({
          data: {
            userId: user.id,
            role: "PLATFORM_OWNER",
            status: "ACTIVE",
            createdByUserId: user.id,
          },
          select: { id: true, role: true, status: true },
        });

    await tx.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: user.emailVerifiedAt ?? now,
        mustChangePassword: false,
        firstAccessCompletedAt: user.firstAccessCompletedAt ?? now,
      },
    });

    const revokedSessions = await tx.authSession.deleteMany({
      where: { userId: user.id },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: user.platformOperator
          ? "platform.operator.bootstrap_confirmed"
          : "platform.operator.created",
        resourceType: "PlatformOperator",
        resourceId: operator.id,
        outcome: "SUCCESS",
        metadata: {
          sessionsRevoked: revokedSessions.count,
          firstAccessBypassed: true,
        },
      },
    });

    return {
      created: !user.platformOperator,
      operatorId: operator.id,
      sessionsRevoked: revokedSessions.count,
    };
  });
}

async function main() {
  const result = await bootstrapPlatformOwner({
    email: process.env.PLATFORM_OWNER_EMAIL,
    confirmation: process.env.PLATFORM_OWNER_CONFIRMATION,
  });
  console.info(JSON.stringify(result));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    console.error("Bootstrap de operador da plataforma falhou.");
    process.exitCode = 1;
  });
}
