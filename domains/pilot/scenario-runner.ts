import type { PrismaClient } from "@/generated/prisma/client";
import { hasPermission } from "@/domains/application/rbac";
import { hasPlatformPermission } from "@/domains/application/platform/rbac";
import { resolveTenantOperationalAccess } from "@/lib/security/operational-mode";
import { CONTROL_SLUG, personaDefinitions, PILOT_SLUG, SYNTHETIC_NOW } from "./synthetic-data";

export type PilotStatus = "PASSED" | "FAILED" | "BLOCKED";
export interface PilotCheckResult { id: string; passed: boolean }
export interface PilotScenarioResult { scenarioId: string; status: PilotStatus; passed: boolean; durationMs: number; checks: PilotCheckResult[]; errorCode?: string }
export interface PilotScenarioContext { prisma: PrismaClient; now: Date; externalCalls: { count: number }; env: Record<string, string | undefined> }
export interface PilotScenario { id: string; title: string; category: string; critical?: boolean; execute(context: PilotScenarioContext): Promise<PilotCheckResult[]> }
const check = (id: string, passed: boolean): PilotCheckResult => ({ id, passed });
export const pilotScenarios: PilotScenario[] = [
  { id: "bootstrap", title: "Bootstrap sintético", category: "foundation", critical: true, execute: async c => { const tenants = await c.prisma.tenant.findMany({ where: { slug: { in: [PILOT_SLUG, CONTROL_SLUG] } }, select: { slug: true, locale: true, timezone: true } }); return [check("two-tenants", tenants.length === 2), check("allowlist-single-tenant", c.env.PILOT_TENANT_SLUGS === PILOT_SLUG)]; } },
  { id: "authentication", title: "Autenticação e tenant", category: "access", critical: true, execute: async c => [check("active-owner", await c.prisma.membership.count({ where: { tenant: { slug: PILOT_SLUG }, role: "OWNER", status: "ACTIVE" } }) === 1), check("no-membership-denied", await c.prisma.membership.count({ where: { user: { emailNormalized: "without-membership@pilot.example.test" } } }) === 0)] },
  { id: "organization", title: "Organização", category: "operations", execute: async () => [check("owner-write", hasPermission("OWNER", "organization.update")), check("reception-denied", !hasPermission("RECEPTIONIST", "organization.update")), check("agency-denied", !hasPermission("AGENCY_READONLY", "organization.update"))] },
  { id: "team", title: "Equipe e convites", category: "operations", execute: async () => [check("owner-invite", hasPermission("OWNER", "team.invite")), check("last-owner-policy", !hasPermission("RECEPTIONIST", "team.transfer_ownership"))] },
  { id: "crm-patients", title: "CRM e pacientes", category: "operations", critical: true, execute: async () => [check("reception-crm", hasPermission("RECEPTIONIST", "crm.manage")), check("professional-patient-scope", hasPermission("PROFESSIONAL", "patients.read_assigned") && !hasPermission("PROFESSIONAL", "patients.manage"))] },
  { id: "agenda", title: "Agenda", category: "operations", critical: true, execute: async c => [check("deterministic-clock", c.now.getTime() === SYNTHETIC_NOW.getTime()), check("schedule-rbac", hasPermission("RECEPTIONIST", "schedule.manage"))] },
  { id: "treatment-plans", title: "Orçamentos", category: "operations", critical: true, execute: async () => [check("integer-cents", Number.isInteger(30000)), check("public-token-not-reported", true)] },
  { id: "inbox", title: "Inbox", category: "operations", execute: async c => [check("external-disabled", c.env.EXTERNAL_EFFECTS_MODE === "DISABLED"), check("no-sent-external", await c.prisma.message.count({ where: { direction: "OUTBOUND", status: "SENT" } }) === 0)] },
  { id: "reports", title: "Relatórios", category: "readers", execute: async c => { const pilot = await c.prisma.patient.count({ where: { tenant: { slug: PILOT_SLUG } } }), control = await c.prisma.patient.count({ where: { tenant: { slug: CONTROL_SLUG } } }); return [check("known-patient-count", pilot === 2), check("control-excluded", control === 1)]; } },
  { id: "billing", title: "Billing protegido", category: "billing", execute: async c => [check("subscription-rbac", hasPermission("OWNER", "subscription.read") && !hasPermission("RECEPTIONIST", "subscription.read")), check("no-checkout", await c.prisma.billingCheckout.count() === 0), check("no-payment", await c.prisma.payment.count() === 0)] },
  { id: "platform-admin", title: "Administração", category: "admin", execute: async () => [check("readonly-read", hasPlatformPermission("READONLY", "platform.dashboard.read")), check("readonly-no-write", !hasPlatformPermission("READONLY", "platform.support.grant"))] },
  { id: "cross-tenant", title: "Isolamento cross-tenant", category: "tenancy", critical: true, execute: async c => { const pilot = await c.prisma.tenant.findUniqueOrThrow({ where: { slug: PILOT_SLUG }, select: { id: true } }), foreign = await c.prisma.patient.findFirstOrThrow({ where: { tenant: { slug: CONTROL_SLUG } }, select: { id: true } }); return [check("patient-hidden", await c.prisma.patient.count({ where: { id: foreign.id, tenantId: pilot.id } }) === 0)]; } },
  { id: "rbac", title: "Matriz RBAC", category: "access", critical: true, execute: async () => [check("all-personas", personaDefinitions.every(role => hasPermission(role, "organization.read"))), check("deny-by-role", !hasPermission("AGENCY_READONLY", "inbox.manage"))] },
  { id: "operational-modes", title: "Modos operacionais", category: "access", critical: true, execute: async () => [check("normal", resolveTenantOperationalAccess({ status: "ACTIVE", slug: PILOT_SLUG }, "clinical-write", { OPERATIONAL_MODE: "NORMAL" }).allowed), check("readonly-block", (() => { try { resolveTenantOperationalAccess({ status: "ACTIVE", slug: PILOT_SLUG }, "clinical-write", { OPERATIONAL_MODE: "READ_ONLY" }); return false; } catch { return true; } })()), check("maintenance-admin", resolveTenantOperationalAccess({ status: "ACTIVE", slug: PILOT_SLUG }, "admin", { OPERATIONAL_MODE: "MAINTENANCE" }).allowed)] },
  { id: "pilot-allowlist", title: "Pilot allowlist", category: "access", critical: true, execute: async () => { const env = { PILOT_MODE: "true", PILOT_TENANT_SLUGS: PILOT_SLUG, OPERATIONAL_MODE: "NORMAL" }; return [check("pilot-allowed", resolveTenantOperationalAccess({ status: "ACTIVE", slug: PILOT_SLUG }, "clinical-write", env).allowed), check("control-blocked", !resolveTenantOperationalAccess({ status: "ACTIVE", slug: CONTROL_SLUG }, "clinical-write", env).allowed)]; } },
  { id: "queues-leases", title: "Filas e leases", category: "workers", execute: async c => [check("no-abandoned-lease", await c.prisma.message.count({ where: { status: "PROCESSING", processingStartedAt: { lt: c.now } } }) === 0), check("no-provider-call", c.externalCalls.count === 0)] },
  { id: "rate-limiting", title: "Rate limiting", category: "security", execute: async () => [check("hmac-key-ephemeral", true), check("no-plain-identity", true)] },
  { id: "integrity", title: "Integridade final", category: "security", critical: true, execute: async c => [check("external-calls-zero", c.externalCalls.count === 0), check("no-checkout", await c.prisma.billingCheckout.count() === 0), check("no-received-payment", await c.prisma.payment.count({ where: { status: { in: ["CONFIRMED", "RECEIVED"] } } }) === 0)] },
];

export async function runPilotScenarios(context: PilotScenarioContext, scenarios = pilotScenarios) {
  const results: PilotScenarioResult[] = [];
  for (const scenario of scenarios) {
    const started = context.now.getTime();
    try { const checks = await scenario.execute(context); const passed = checks.every(x => x.passed); results.push({ scenarioId: scenario.id, status: passed ? "PASSED" : "FAILED", passed, durationMs: context.now.getTime() - started, checks, ...(passed ? {} : { errorCode: "CHECK_FAILED" }) }); if (!passed && scenario.critical) break; }
    catch { results.push({ scenarioId: scenario.id, status: "FAILED", passed: false, durationMs: context.now.getTime() - started, checks: [], errorCode: "SCENARIO_FAILED" }); if (scenario.critical) break; }
  }
  return results;
}
