import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@/generated/prisma/client";
import { CONTROL_SLUG, PILOT_SLUG, SYNTHETIC_DATASET_VERSION } from "@/domains/pilot/synthetic-data";
import { REHEARSAL_CONTRACT_VERSION } from "./rehearsal";

export function versionedMigrationsDigest(root = join(process.cwd(), "prisma/migrations")) {
  const hash = createHash("sha256");
  for (const name of readdirSync(root).filter((x) => /^\d+_[a-z0-9_]+$/i.test(x)).sort()) {
    hash.update(name).update("\0").update(readFileSync(join(root, name, "migration.sql"))).update("\0");
  }
  return hash.digest("hex");
}

export async function createDatabaseFingerprint(prisma: PrismaClient) {
  const migrations = await prisma.$queryRaw<Array<{ count: number }>>`SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  const [tenants, users, memberships, patients, plans, items, appointments, auditLogs, webhooks, subscriptions, payments, messages, rateLimits] = await Promise.all([
    prisma.tenant.count({ where: { slug: { in: [PILOT_SLUG, CONTROL_SLUG] } } }), prisma.user.count(), prisma.membership.count(), prisma.patient.count(),
    prisma.treatmentPlan.count(), prisma.treatmentPlanItem.count(), prisma.appointment.count(), prisma.auditLog.count(), prisma.webhookEvent.count(),
    prisma.subscription.count(), prisma.payment.count(), prisma.message.count(), prisma.securityRateLimitBucket.count(),
  ]);
  const canonical = await prisma.tenant.findMany({ where: { slug: { in: [PILOT_SLUG, CONTROL_SLUG] } }, select: { id: true, slug: true }, orderBy: { slug: "asc" } });
  return {
    contractVersion: REHEARSAL_CONTRACT_VERSION, datasetVersion: SYNTHETIC_DATASET_VERSION,
    migrationCount: Number(migrations[0]?.count ?? 0), migrationDigest: versionedMigrationsDigest(), essentialTableCount: 13,
    counts: { tenants, users, memberships, patients, plans, items, appointments, auditLogs, webhooks, subscriptions, payments, messages, rateLimits },
    canonicalIdDigest: createHash("sha256").update(canonical.map((x) => `${x.slug}:${x.id}`).join("|")).digest("hex"),
  };
}
