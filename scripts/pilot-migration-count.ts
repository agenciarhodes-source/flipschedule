import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "../generated/prisma/client";
export function countMigrationDirectories(root=join(process.cwd(),"prisma/migrations")){return readdirSync(root).filter(name=>/^\d+_[a-z0-9_]+$/i.test(name)&&statSync(join(root,name)).isDirectory()).length}
export async function countAppliedMigrations(prisma:PrismaClient){const rows=await prisma.$queryRawUnsafe<Array<{count:number}>>('SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');return Number(rows[0]?.count??0)}
export async function assertMigrationParity(prisma:PrismaClient,root?:string){const artifacts=countMigrationDirectories(root),applied=await countAppliedMigrations(prisma);if(artifacts!==applied)throw new Error("MIGRATION_COUNT_MISMATCH");return applied}
