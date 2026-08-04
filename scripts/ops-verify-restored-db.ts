import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../generated/prisma/client";

function parsePostgresUrl(raw: string, errorCode: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(errorCode);
  }
  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) {
    throw new Error(errorCode);
  }
  return url;
}

export async function verifyIsolatedProviderRestore(
  env: Record<string, string | undefined> = process.env,
) {
  const restoredRaw = env.RESTORED_DATABASE_URL?.trim();
  if (!restoredRaw) throw new Error("RESTORED_DATABASE_URL_REQUIRED");

  const restored = parsePostgresUrl(restoredRaw, "RESTORED_DATABASE_URL_INVALID");
  const sourceRaw = env.SOURCE_DATABASE_URL?.trim();
  if (sourceRaw) {
    const source = parsePostgresUrl(sourceRaw, "SOURCE_DATABASE_URL_INVALID");
    if (source.href === restored.href) throw new Error("RESTORE_SOURCE_MATCH_DENIED");
  }

  const looksExplicitlyIsolated = /(?:restore|isolated|test)/i.test(
    `${restored.hostname}/${restored.pathname}`,
  );
  if (!looksExplicitlyIsolated && env.CONFIRM_ISOLATED_RESTORE !== "yes") {
    throw new Error("ISOLATED_RESTORE_CONFIRMATION_REQUIRED");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: restored.href }),
  });
  try {
    const [migrations, tables] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*)
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*)
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('Tenant', 'User', 'Membership', 'AuditLog', 'WebhookEvent')
      `,
    ]);

    const migrationCount = Number(migrations[0]?.count ?? 0);
    const essentialTableCount = Number(tables[0]?.count ?? 0);
    if (migrationCount < 1 || essentialTableCount !== 5) {
      throw new Error("RESTORED_DATABASE_STRUCTURE_INVALID");
    }

    return { migrationCount, essentialTableCount, verified: true };
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyIsolatedProviderRestore()
    .then((result) => console.info(JSON.stringify(result)))
    .catch((error: unknown) => {
      const errorCode =
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "RESTORED_DATABASE_VERIFICATION_FAILED";
      console.error(`Verificação da base restaurada falhou: ${errorCode}`);
      process.exitCode = 1;
    });
}
