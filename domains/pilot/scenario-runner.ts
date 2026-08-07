import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import { hasPermission } from "@/domains/application/rbac";
import { hasPlatformPermission } from "@/domains/application/platform/rbac";
import { PatientService } from "@/domains/infrastructure/prisma/crm-patient-services";
import { TreatmentPlanService } from "@/domains/infrastructure/prisma/treatment-inbox-services";
import { createAuth } from "@/lib/auth/server";
import { resolveAuthenticatedUserContext } from "@/lib/auth/session-resolution";
import { resolveTenantOperationalAccess } from "@/lib/security/operational-mode";
import { DurableRateLimiter } from "@/lib/security/rate-limit";
import {
  CONTROL_SLUG,
  personaDefinitions,
  PILOT_SLUG,
  SYNTHETIC_NOW,
  SYNTHETIC_OWNER_EMAIL,
} from "./synthetic-data";

export type PilotStatus = "PASSED" | "FAILED" | "BLOCKED";
export interface PilotCheckResult {
  id: string;
  passed: boolean;
}
export interface PilotScenarioResult {
  scenarioId: string;
  status: PilotStatus;
  passed: boolean;
  durationMs: number;
  checks: PilotCheckResult[];
  errorCode?: string;
}
export interface PilotScenarioContext {
  prisma: PrismaClient;
  now: Date;
  externalCalls: { count: number };
  env: Record<string, string | undefined>;
}
export interface PilotScenario {
  id: string;
  title: string;
  category: string;
  critical?: boolean;
  execute(context: PilotScenarioContext): Promise<PilotCheckResult[]>;
}

const check = (id: string, passed: boolean): PilotCheckResult => ({ id, passed });

async function getPilotOwnerContext(prisma: PrismaClient): Promise<ApplicationContext> {
  const membership = await prisma.membership.findFirst({
    where: {
      tenant: { slug: PILOT_SLUG },
      role: "OWNER",
      status: "ACTIVE",
      user: { emailNormalized: SYNTHETIC_OWNER_EMAIL, status: "ACTIVE" },
    },
    select: {
      id: true,
      tenantId: true,
      role: true,
      user: { select: { id: true, displayName: true, emailNormalized: true } },
      tenant: { select: { slug: true, timezone: true } },
    },
  });
  if (!membership) throw new Error("SYNTHETIC_OWNER_CONTEXT_NOT_FOUND");
  return {
    userId: membership.user.id,
    membershipId: membership.id,
    membershipRole: membership.role,
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    tenantTimezone: membership.tenant.timezone,
    displayName: membership.user.displayName,
    email: membership.user.emailNormalized,
    clinicAccess: { mode: "ALL", clinicIds: [] },
  };
}

function cookieHeaderFromResponse(headers: Headers) {
  const setCookies = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie")].filter((value): value is string => Boolean(value));
  return setCookies
    .map((value) => value.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

async function runAuthenticationScenario(context: PilotScenarioContext) {
  const password = context.env.SYNTHETIC_PILOT_PASSWORD ?? "";
  const auth = createAuth(context.prisma);
  const signedIn = await auth.api.signInEmail({
    returnHeaders: true,
    body: { email: SYNTHETIC_OWNER_EMAIL, password },
  });
  const cookie = cookieHeaderFromResponse(signedIn.headers);
  const session = cookie
    ? await auth.api.getSession({ headers: new Headers({ cookie }) })
    : null;

  let tenantResolved = false;
  if (session?.user) {
    const resolved = await resolveAuthenticatedUserContext(
      context.prisma,
      session.user.id,
      PILOT_SLUG,
    );
    tenantResolved = !resolved.firstAccessRequired && resolved.tenantSlug === PILOT_SLUG;
  }

  const withoutMembership = await context.prisma.user.findUnique({
    where: { emailNormalized: "without-membership@pilot.example.test" },
    select: { id: true },
  });
  let noMembershipDenied = false;
  if (withoutMembership) {
    try {
      await resolveAuthenticatedUserContext(
        context.prisma,
        withoutMembership.id,
        PILOT_SLUG,
      );
    } catch {
      noMembershipDenied = true;
    }
  }

  if (session?.user) {
    await context.prisma.authSession.deleteMany({ where: { userId: session.user.id } });
  }

  return [
    check("credential-sign-in", Boolean(cookie && session?.user?.id)),
    check("server-session-resolved", session?.user?.email === SYNTHETIC_OWNER_EMAIL),
    check("tenant-resolved-through-auth-boundary", tenantResolved),
    check("no-membership-denied", noMembershipDenied),
  ];
}

async function runTreatmentPlanScenario(context: PilotScenarioContext) {
  const applicationContext = await getPilotOwnerContext(context.prisma);
  const [patient, clinic, professional, procedures] = await Promise.all([
    context.prisma.patient.findFirst({
      where: { tenantId: applicationContext.tenantId, name: { contains: "Paciente Sintético 01" } },
      select: { id: true },
    }),
    context.prisma.clinic.findFirst({
      where: { tenantId: applicationContext.tenantId, slug: "unidade-sintetica" },
      select: { id: true },
    }),
    context.prisma.professional.findFirst({
      where: { tenantId: applicationContext.tenantId },
      orderBy: { id: "asc" },
      select: { id: true },
    }),
    context.prisma.procedure.findMany({
      where: { tenantId: applicationContext.tenantId },
      orderBy: { defaultPriceCents: "asc" },
      take: 2,
      select: { id: true, name: true, defaultPriceCents: true },
    }),
  ]);
  if (!patient || !clinic || !professional || procedures.length !== 2) {
    return [check("references-available", false)];
  }

  const service = new TreatmentPlanService(applicationContext, context.prisma);
  const result = await service.create({
    patientId: patient.id,
    clinicId: clinic.id,
    professionalId: professional.id,
    leadId: null,
    title: "[SINTÉTICO] Orçamento calculado pelo serviço real",
    discountCents: 5_000,
    expiresAt: new Date(context.now.getTime() + 86_400_000),
    items: [
      {
        procedureId: procedures[0]!.id,
        description: procedures[0]!.name,
        quantity: 2,
        unitPriceCents: 10_000,
        discountCents: 1_000,
      },
      {
        procedureId: procedures[1]!.id,
        description: procedures[1]!.name,
        quantity: 1,
        unitPriceCents: 20_000,
        discountCents: 0,
      },
    ],
  });
  if (!result.ok) return [check("service-create", false)];

  const plan = await context.prisma.treatmentPlan.findFirst({
    where: { id: result.data.id, tenantId: applicationContext.tenantId },
    select: {
      subtotalCents: true,
      discountCents: true,
      totalCents: true,
      publicTokenHash: true,
      items: { orderBy: { position: "asc" }, select: { totalCents: true } },
    },
  });

  return [
    check("service-create", Boolean(plan)),
    check("integer-cents", Boolean(plan && [
      plan.subtotalCents,
      plan.discountCents,
      plan.totalCents,
      ...plan.items.map((item) => item.totalCents),
    ].every(Number.isInteger))),
    check("real-subtotal", plan?.subtotalCents === 39_000),
    check("real-total", plan?.totalCents === 34_000),
    check("real-item-totals", plan?.items[0]?.totalCents === 19_000 && plan.items[1]?.totalCents === 20_000),
    check("public-token-not-created", plan?.publicTokenHash === null),
  ];
}

async function runCrossTenantScenario(context: PilotScenarioContext) {
  const applicationContext = await getPilotOwnerContext(context.prisma);
  const foreign = await context.prisma.patient.findFirstOrThrow({
    where: { tenant: { slug: CONTROL_SLUG } },
    select: { id: true, name: true },
  });
  const service = new PatientService(applicationContext, context.prisma);
  const result = await service.update(foreign.id, {
    name: "[SINTÉTICO] Tentativa cross-tenant",
    phoneE164: null,
    emailNormalized: null,
    birthDate: null,
    archived: false,
  });
  const unchanged = await context.prisma.patient.findUnique({
    where: { id: foreign.id },
    select: { name: true },
  });
  return [
    check("patient-service-denied-as-not-found", !result.ok && result.code === "NOT_FOUND"),
    check("foreign-patient-unchanged", unchanged?.name === foreign.name),
  ];
}

async function runRateLimitScenario(context: PilotScenarioContext) {
  const [pilotTenant, controlTenant] = await Promise.all([
    context.prisma.tenant.findUniqueOrThrow({ where: { slug: PILOT_SLUG }, select: { id: true } }),
    context.prisma.tenant.findUniqueOrThrow({ where: { slug: CONTROL_SLUG }, select: { id: true } }),
  ]);
  const scope = "synthetic-pilot-rehearsal";
  await context.prisma.securityRateLimitBucket.deleteMany({ where: { scope } });
  const limiter = new DurableRateLimiter(context.prisma);
  const policy = { scope, limit: 1, windowMs: 60_000, blockMs: 120_000 };
  const identity = ["synthetic-shared-identity"];
  const first = await limiter.consume(identity, policy, pilotTenant.id, context.now);
  const blocked = await limiter.consume(
    identity,
    policy,
    pilotTenant.id,
    new Date(context.now.getTime() + 1),
  );
  const isolated = await limiter.consume(
    identity,
    policy,
    controlTenant.id,
    new Date(context.now.getTime() + 1),
  );
  const rows = await context.prisma.securityRateLimitBucket.findMany({
    where: { scope },
    select: { tenantId: true, keyHash: true, count: true, blockedUntil: true },
  });
  const pilotRow = rows.find((row) => row.tenantId === pilotTenant.id);
  const controlRow = rows.find((row) => row.tenantId === controlTenant.id);
  return [
    check("real-first-request-allowed", first.allowed),
    check("real-limit-enforced", !blocked.allowed && blocked.retryAfterSeconds > 0),
    check("tenant-boundary-isolated", isolated.allowed),
    check("identity-hashed", Boolean(pilotRow && /^[a-f0-9]{64}$/.test(pilotRow.keyHash) && !pilotRow.keyHash.includes(identity[0]!))),
    check("tenant-hashes-differ", Boolean(pilotRow && controlRow && pilotRow.keyHash !== controlRow.keyHash)),
    check("durable-penalty-persisted", Boolean(pilotRow?.blockedUntil && pilotRow.count === 2)),
  ];
}

export const pilotScenarios: PilotScenario[] = [
  {
    id: "bootstrap",
    title: "Bootstrap sintético",
    category: "foundation",
    critical: true,
    execute: async (context) => {
      const tenants = await context.prisma.tenant.findMany({
        where: { slug: { in: [PILOT_SLUG, CONTROL_SLUG] } },
        select: { slug: true, locale: true, timezone: true },
      });
      return [
        check("two-tenants", tenants.length === 2),
        check("allowlist-single-tenant", context.env.PILOT_TENANT_SLUGS === PILOT_SLUG),
      ];
    },
  },
  {
    id: "authentication",
    title: "Autenticação e tenant",
    category: "access",
    critical: true,
    execute: runAuthenticationScenario,
  },
  {
    id: "organization",
    title: "Organização",
    category: "operations",
    execute: async () => [
      check("owner-write", hasPermission("OWNER", "organization.update")),
      check("reception-denied", !hasPermission("RECEPTIONIST", "organization.update")),
      check("agency-denied", !hasPermission("AGENCY_READONLY", "organization.update")),
    ],
  },
  {
    id: "team",
    title: "Equipe e convites",
    category: "operations",
    execute: async () => [
      check("owner-invite", hasPermission("OWNER", "team.invite")),
      check("last-owner-policy", !hasPermission("RECEPTIONIST", "team.transfer_ownership")),
    ],
  },
  {
    id: "crm-patients",
    title: "CRM e pacientes",
    category: "operations",
    critical: true,
    execute: async () => [
      check("reception-crm", hasPermission("RECEPTIONIST", "crm.manage")),
      check(
        "professional-patient-scope",
        hasPermission("PROFESSIONAL", "patients.read_assigned") &&
          !hasPermission("PROFESSIONAL", "patients.manage"),
      ),
    ],
  },
  {
    id: "agenda",
    title: "Agenda",
    category: "operations",
    critical: true,
    execute: async (context) => [
      check("deterministic-clock", context.now.getTime() === SYNTHETIC_NOW.getTime()),
      check("schedule-rbac", hasPermission("RECEPTIONIST", "schedule.manage")),
    ],
  },
  {
    id: "treatment-plans",
    title: "Orçamentos",
    category: "operations",
    critical: true,
    execute: runTreatmentPlanScenario,
  },
  {
    id: "inbox",
    title: "Inbox",
    category: "operations",
    execute: async (context) => [
      check("external-disabled", context.env.EXTERNAL_EFFECTS_MODE === "DISABLED"),
      check(
        "no-sent-external",
        await context.prisma.message.count({ where: { direction: "OUTBOUND", status: "SENT" } }) === 0,
      ),
    ],
  },
  {
    id: "reports",
    title: "Relatórios",
    category: "readers",
    execute: async (context) => {
      const pilot = await context.prisma.patient.count({ where: { tenant: { slug: PILOT_SLUG } } });
      const control = await context.prisma.patient.count({ where: { tenant: { slug: CONTROL_SLUG } } });
      return [check("known-patient-count", pilot === 2), check("control-excluded", control === 1)];
    },
  },
  {
    id: "billing",
    title: "Billing protegido",
    category: "billing",
    execute: async (context) => [
      check(
        "subscription-rbac",
        hasPermission("OWNER", "subscription.read") &&
          !hasPermission("RECEPTIONIST", "subscription.read"),
      ),
      check("no-checkout", await context.prisma.billingCheckout.count() === 0),
      check("no-payment", await context.prisma.payment.count() === 0),
    ],
  },
  {
    id: "platform-admin",
    title: "Administração",
    category: "admin",
    execute: async () => [
      check("readonly-read", hasPlatformPermission("READONLY", "platform.dashboard.read")),
      check("readonly-no-write", !hasPlatformPermission("READONLY", "platform.support.grant")),
    ],
  },
  {
    id: "cross-tenant",
    title: "Isolamento cross-tenant",
    category: "tenancy",
    critical: true,
    execute: runCrossTenantScenario,
  },
  {
    id: "rbac",
    title: "Matriz RBAC",
    category: "access",
    critical: true,
    execute: async () => [
      check("all-personas", personaDefinitions.every((role) => hasPermission(role, "organization.read"))),
      check("deny-by-role", !hasPermission("AGENCY_READONLY", "inbox.manage")),
    ],
  },
  {
    id: "operational-modes",
    title: "Modos operacionais",
    category: "access",
    critical: true,
    execute: async () => [
      check(
        "normal",
        resolveTenantOperationalAccess(
          { status: "ACTIVE", slug: PILOT_SLUG },
          "clinical-write",
          { OPERATIONAL_MODE: "NORMAL" },
        ).allowed,
      ),
      check("readonly-block", (() => {
        try {
          resolveTenantOperationalAccess(
            { status: "ACTIVE", slug: PILOT_SLUG },
            "clinical-write",
            { OPERATIONAL_MODE: "READ_ONLY" },
          );
          return false;
        } catch {
          return true;
        }
      })()),
      check(
        "maintenance-admin",
        resolveTenantOperationalAccess(
          { status: "ACTIVE", slug: PILOT_SLUG },
          "admin",
          { OPERATIONAL_MODE: "MAINTENANCE" },
        ).allowed,
      ),
    ],
  },
  {
    id: "pilot-allowlist",
    title: "Pilot allowlist",
    category: "access",
    critical: true,
    execute: async () => {
      const env = {
        PILOT_MODE: "true",
        PILOT_TENANT_SLUGS: PILOT_SLUG,
        OPERATIONAL_MODE: "NORMAL",
      };
      return [
        check(
          "pilot-allowed",
          resolveTenantOperationalAccess(
            { status: "ACTIVE", slug: PILOT_SLUG },
            "clinical-write",
            env,
          ).allowed,
        ),
        check(
          "control-blocked",
          !resolveTenantOperationalAccess(
            { status: "ACTIVE", slug: CONTROL_SLUG },
            "clinical-write",
            env,
          ).allowed,
        ),
      ];
    },
  },
  {
    id: "queues-leases",
    title: "Filas e leases",
    category: "workers",
    execute: async (context) => [
      check(
        "no-abandoned-lease",
        await context.prisma.message.count({
          where: { status: "PROCESSING", processingStartedAt: { lt: context.now } },
        }) === 0,
      ),
      check("no-provider-call", context.externalCalls.count === 0),
    ],
  },
  {
    id: "rate-limiting",
    title: "Rate limiting",
    category: "security",
    execute: runRateLimitScenario,
  },
  {
    id: "integrity",
    title: "Integridade final",
    category: "security",
    critical: true,
    execute: async (context) => [
      check("external-calls-zero", context.externalCalls.count === 0),
      check("no-checkout", await context.prisma.billingCheckout.count() === 0),
      check(
        "no-received-payment",
        await context.prisma.payment.count({
          where: { status: { in: ["CONFIRMED", "RECEIVED"] } },
        }) === 0,
      ),
    ],
  },
];

export async function runPilotScenarios(
  context: PilotScenarioContext,
  scenarios = pilotScenarios,
) {
  const results: PilotScenarioResult[] = [];
  for (const scenario of scenarios) {
    const started = context.now.getTime();
    try {
      const checks = await scenario.execute(context);
      const passed = checks.every((item) => item.passed);
      results.push({
        scenarioId: scenario.id,
        status: passed ? "PASSED" : "FAILED",
        passed,
        durationMs: context.now.getTime() - started,
        checks,
        ...(passed ? {} : { errorCode: "CHECK_FAILED" }),
      });
      if (!passed && scenario.critical) break;
    } catch {
      results.push({
        scenarioId: scenario.id,
        status: "FAILED",
        passed: false,
        durationMs: context.now.getTime() - started,
        checks: [],
        errorCode: "SCENARIO_FAILED",
      });
      if (scenario.critical) break;
    }
  }
  return results;
}
