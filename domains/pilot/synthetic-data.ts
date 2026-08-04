import type { PrismaClient } from "@/generated/prisma/client";

export type SyntheticDatasetProfile = "DISPOSABLE_REHEARSAL" | "EXTERNAL_STAGING_PILOT";
export const SYNTHETIC_DATASET_PROFILES = { DISPOSABLE_REHEARSAL: "DISPOSABLE_REHEARSAL", EXTERNAL_STAGING_PILOT: "EXTERNAL_STAGING_PILOT" } as const;

export const SYNTHETIC_NOW = new Date("2030-06-17T12:00:00.000Z");
export const SYNTHETIC_DATASET_VERSION = "1.0.0";
export const SYNTHETIC_MARKER = "[SINTÉTICO]";
export const PILOT_SLUG = "piloto-sintetico";
export const CONTROL_SLUG = "controle-sintetico";
export const SYNTHETIC_OWNER_EMAIL = "owner@pilot.example.test";
export const SYNTHETIC_DATABASE_ID = "DISPOSABLE_LOCAL_POSTGRES";

const ids = {
  pilot: "00000000-0000-4000-8000-000000000001",
  control: "00000000-0000-4000-8000-000000000002",
  clinic: "00000000-0000-4000-8000-000000000010",
  entitlement: "00000000-0000-4000-8000-000000000011",
};

export const personaDefinitions = [
  "OWNER",
  "MANAGER",
  "RECEPTIONIST",
  "PROFESSIONAL",
  "AGENCY_READONLY",
] as const;

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;

function assertDisposableDatabase(env: Record<string, string | undefined>) {
  if (env.SYNTHETIC_PILOT_DATABASE_ID !== SYNTHETIC_DATABASE_ID) {
    throw new Error("SYNTHETIC_PILOT_DATABASE_ID_REQUIRED");
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(env.DATABASE_URL ?? "");
  } catch {
    throw new Error("SYNTHETIC_PILOT_DATABASE_DENIED");
  }

  const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  const port = databaseUrl.port || "5432";
  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    !allowedHosts.has(databaseUrl.hostname) ||
    port !== "5432" ||
    databaseUrl.pathname !== "/synthetic_pilot" ||
    databaseUrl.username !== "ephemeral" ||
    databaseUrl.password !== "ephemeral" ||
    databaseUrl.search ||
    databaseUrl.hash
  ) {
    throw new Error("SYNTHETIC_PILOT_DATABASE_DENIED");
  }

  const directUrl = env.DIRECT_DATABASE_URL?.trim();
  if (directUrl && directUrl !== env.DATABASE_URL?.trim()) {
    throw new Error("SYNTHETIC_PILOT_DATABASE_MISMATCH");
  }
}

export function assertSyntheticPilotSeedEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.APP_ENV !== "staging" && env.APP_ENV !== "staging-rehearsal") {
    throw new Error("SYNTHETIC_PILOT_STAGING_ONLY");
  }
  if (env.SEED_CONFIRMATION !== "SEED_SYNTHETIC_PILOT") {
    throw new Error("SYNTHETIC_PILOT_CONFIRMATION_REQUIRED");
  }
  if (env.EXTERNAL_EFFECTS_MODE !== "DISABLED") {
    throw new Error("SYNTHETIC_PILOT_EXTERNAL_EFFECTS_MUST_BE_DISABLED");
  }
  if (env.PILOT_TENANT_SLUGS !== PILOT_SLUG) {
    throw new Error("SYNTHETIC_PILOT_ALLOWLIST_INVALID");
  }
  assertDisposableDatabase(env);
}

export async function seedSyntheticPilot(prisma: PrismaClient) {
  await prisma.tenant.upsert({
    where: { slug: PILOT_SLUG },
    create: {
      id: ids.pilot,
      slug: PILOT_SLUG,
      name: `${SYNTHETIC_MARKER} Clínica Piloto Fictícia`,
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
    update: {},
  });
  await prisma.tenant.upsert({
    where: { slug: CONTROL_SLUG },
    create: {
      id: ids.control,
      slug: CONTROL_SLUG,
      name: `${SYNTHETIC_MARKER} Clínica Controle Fictícia`,
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
    },
    update: {},
  });

  const memberships: Record<string, string> = {};
  for (const [index, role] of personaDefinitions.entries()) {
    const userId = uuid(100 + index);
    const membershipId = uuid(200 + index);
    const email = `${role.toLowerCase()}@pilot.example.test`;
    await prisma.user.upsert({
      where: { emailNormalized: email },
      create: {
        id: userId,
        emailNormalized: email,
        displayName: `${SYNTHETIC_MARKER} Persona ${role}`,
        emailVerified: true,
        emailVerifiedAt: SYNTHETIC_NOW,
      },
      update: {},
    });
    await prisma.membership.upsert({
      where: { tenantId_userId: { tenantId: ids.pilot, userId } },
      create: {
        id: membershipId,
        tenantId: ids.pilot,
        userId,
        role,
        status: "ACTIVE",
        acceptedAt: SYNTHETIC_NOW,
      },
      update: {},
    });
    memberships[role] = membershipId;
  }

  const controlUser = uuid(150);
  await prisma.user.upsert({
    where: { emailNormalized: "control@pilot.example.test" },
    create: {
      id: controlUser,
      emailNormalized: "control@pilot.example.test",
      displayName: `${SYNTHETIC_MARKER} Persona Controle`,
      emailVerified: true,
      emailVerifiedAt: SYNTHETIC_NOW,
    },
    update: {},
  });
  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: ids.control, userId: controlUser } },
    create: {
      id: uuid(250),
      tenantId: ids.control,
      userId: controlUser,
      role: "OWNER",
      status: "ACTIVE",
      acceptedAt: SYNTHETIC_NOW,
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { emailNormalized: "without-membership@pilot.example.test" },
    create: {
      id: uuid(151),
      emailNormalized: "without-membership@pilot.example.test",
      displayName: `${SYNTHETIC_MARKER} Sem Membership`,
      emailVerified: true,
      emailVerifiedAt: SYNTHETIC_NOW,
    },
    update: {},
  });

  await prisma.clinic.upsert({
    where: { tenantId_slug: { tenantId: ids.pilot, slug: "unidade-sintetica" } },
    create: {
      id: ids.clinic,
      tenantId: ids.pilot,
      slug: "unidade-sintetica",
      name: `${SYNTHETIC_MARKER} Unidade Fictícia`,
    },
    update: {},
  });

  for (let index = 0; index < 2; index += 1) {
    await prisma.professional.upsert({
      where: { id: uuid(300 + index) },
      create: {
        id: uuid(300 + index),
        tenantId: ids.pilot,
        membershipId: index === 0 ? memberships.PROFESSIONAL! : null,
        name: `${SYNTHETIC_MARKER} Profissional ${index + 1}`,
        specialty: "ESPECIALIDADE FICTÍCIA",
        clinics: { create: { tenantId: ids.pilot, clinicId: ids.clinic } },
      },
      update: {},
    });
  }

  for (let index = 0; index < 3; index += 1) {
    await prisma.procedure.upsert({
      where: { id: uuid(400 + index) },
      create: {
        id: uuid(400 + index),
        tenantId: ids.pilot,
        name: `${SYNTHETIC_MARKER} Procedimento ${index + 1}`,
        category: "DADO EXCLUSIVAMENTE FICTÍCIO",
        durationMinutes: 30,
        defaultPriceCents: (index + 1) * 10_000,
      },
      update: {},
    });
  }

  for (let index = 0; index < 2; index += 1) {
    await prisma.patient.upsert({
      where: { id: uuid(500 + index) },
      create: {
        id: uuid(500 + index),
        tenantId: ids.pilot,
        name: `${SYNTHETIC_MARKER} Paciente Sintético ${String(index + 1).padStart(2, "0")}`,
        phoneE164: null,
        emailNormalized: null,
        cpfCiphertext: null,
        cpfHash: null,
      },
      update: {},
    });
  }
  await prisma.patient.upsert({
    where: { id: uuid(550) },
    create: {
      id: uuid(550),
      tenantId: ids.control,
      name: `${SYNTHETIC_MARKER} Paciente Controle`,
      phoneE164: null,
    },
    update: {},
  });

  await prisma.integration.upsert({
    where: { id: uuid(600) },
    create: {
      id: uuid(600),
      tenantId: ids.pilot,
      provider: "WHATSAPP",
      status: "DISCONNECTED",
    },
    update: {},
  });
  await prisma.accessEntitlement.upsert({
    where: { id: ids.entitlement },
    create: {
      id: ids.entitlement,
      tenantId: ids.pilot,
      type: "INTERNAL",
      status: "ACTIVE",
      startsAt: SYNTHETIC_NOW,
      reason: `${SYNTHETIC_MARKER} acesso técnico sem pagamento`,
    },
    update: {},
  });

  return {
    tenantCount: 2,
    personaCount: personaDefinitions.length + 2,
    datasetVersion: SYNTHETIC_DATASET_VERSION,
  };
}
