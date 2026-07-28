import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { readDatabaseEnv } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const { databaseUrl } = readDatabaseEnv();
  const client = new PrismaClient({ adapter: new PrismaNeon({ connectionString: databaseUrl }) });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}
