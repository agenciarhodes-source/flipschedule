import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { readDatabaseEnv } from "./env";

/**
 * Creates an isolated Prisma client for bounded CLI operations and disposable
 * PostgreSQL rehearsals. The Next.js runtime continues to use the Neon adapter
 * from lib/db/client.ts.
 */
export function createCliPrismaClient(): PrismaClient {
  const { databaseUrl } = readDatabaseEnv();
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
