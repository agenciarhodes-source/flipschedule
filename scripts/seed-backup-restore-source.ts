import { hashPassword } from "better-auth/crypto";

import { assertRehearsalEnvironment } from "../domains/backup-restore/rehearsal";
import {
  seedSyntheticPilot,
  SYNTHETIC_OWNER_EMAIL,
} from "../domains/pilot/synthetic-data";
import { createCliPrismaClient } from "../lib/db/cli-client";

function assertSourceDatabaseSelected(env: Record<string, string | undefined>) {
  const { source } = assertRehearsalEnvironment(env);
  const selected = env.DATABASE_URL?.trim();
  const direct = env.DIRECT_DATABASE_URL?.trim();
  const expected = env.SOURCE_DATABASE_URL?.trim();

  if (!selected || selected !== expected || (direct && direct !== expected)) {
    throw new Error("BACKUP_SOURCE_DATABASE_MISMATCH");
  }
  if (new URL(selected).pathname.slice(1) !== source.database) {
    throw new Error("BACKUP_SOURCE_DATABASE_DENIED");
  }
}

async function provisionSyntheticCredential(
  prisma: ReturnType<typeof createCliPrismaClient>,
  password: string,
) {
  if (password.length < 32) throw new Error("SYNTHETIC_PILOT_PASSWORD_INVALID");
  const owner = await prisma.user.findUnique({
    where: { emailNormalized: SYNTHETIC_OWNER_EMAIL },
    select: { id: true },
  });
  if (!owner) throw new Error("SYNTHETIC_PILOT_OWNER_NOT_FOUND");

  const passwordHash = await hashPassword(password);
  await prisma.authAccount.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: owner.id,
      },
    },
    create: {
      providerId: "credential",
      accountId: owner.id,
      userId: owner.id,
      password: passwordHash,
    },
    update: { password: passwordHash },
  });
}

export async function main() {
  assertSourceDatabaseSelected(process.env);
  const password = process.env.SYNTHETIC_PILOT_PASSWORD ?? "";
  const prisma = createCliPrismaClient();
  try {
    const result = await seedSyntheticPilot(prisma);
    await provisionSyntheticCredential(prisma, password);
    console.info(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const code =
      error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : "BACKUP_SOURCE_SEED_FAILED";
    console.error(`Seed da origem descartável falhou: ${code}`);
    process.exitCode = 1;
  });
}
