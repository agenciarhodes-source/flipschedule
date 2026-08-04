import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { readDatabaseEnv } from "./env";

/**
 * Creates an isolated Prisma client for bounded operational CLI commands and
 * disposable PostgreSQL rehearsals. Application requests continue to use the
 * Neon adapter from lib/db/client.ts; this client is never imported by Next.js.
 */
export function createCliPrismaClient(): PrismaClient {
  const { databaseUrl } = readDatabaseEnv();
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
