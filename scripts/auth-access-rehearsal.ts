import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "@/generated/prisma/client";
import { resolvePostLoginDestinationForUser } from "@/lib/auth/post-login-destination";
import { createAuth } from "@/lib/auth/server";

const baseUrl = "http://127.0.0.1:3000";
const testPassword = "Synthetic!Access51";

type Fixture = {
  email: string;
  expectedDestination?: string;
  expectLoginDenied?: boolean;
};

function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value?.startsWith("postgresql://")) {
    throw new Error("AUTH_REHEARSAL_DATABASE_REQUIRED");
  }
  return value;
}

function firstCookie(response: Response) {
  const value = response.headers.get("set-cookie");
  if (!value) throw new Error("AUTH_REHEARSAL_SESSION_COOKIE_MISSING");
  return value.split(";", 1)[0]!;
}

async function createCredentialUser(
  database: PrismaClient,
  input: {
    email: string;
    name: string;
    status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
    mustChangePassword?: boolean;
  },
) {
  const user = await database.user.create({
    data: {
      emailNormalized: input.email,
      displayName: input.name,
      status: input.status ?? "ACTIVE",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      mustChangePassword: input.mustChangePassword ?? false,
      ...(!input.mustChangePassword
        ? { firstAccessCompletedAt: new Date(), passwordChangedAt: new Date() }
        : {}),
    },
  });
  await database.authAccount.create({
    data: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: await hashPassword(testPassword),
    },
  });
  return user;
}

async function attachTenant(
  database: PrismaClient,
  userId: string,
  slug: string,
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED" = "ACTIVE",
) {
  const tenant = await database.tenant.create({
    data: {
      name: `Clínica ${slug}`,
      slug,
      status,
      timezone: "America/Sao_Paulo",
    },
  });
  await database.clinic.create({
    data: { tenantId: tenant.id, name: `Clínica ${slug}`, slug },
  });
  await database.membership.create({
    data: {
      tenantId: tenant.id,
      userId,
      role: "OWNER",
      status: "ACTIVE",
      acceptedAt: new Date(),
    },
  });
  return tenant;
}

async function seed(database: PrismaClient): Promise<Fixture[]> {
  const admin = await createCredentialUser(database, {
    email: "admin-auth-51@example.test",
    name: "Admin Sintético",
  });
  await database.platformOperator.create({
    data: { userId: admin.id, role: "PLATFORM_OWNER", status: "ACTIVE" },
  });

  const tenantOwner = await createCredentialUser(database, {
    email: "tenant-auth-51@example.test",
    name: "Proprietário Sintético",
  });
  await attachTenant(database, tenantOwner.id, "clinica-auth-51");

  const firstAccess = await createCredentialUser(database, {
    email: "first-access-51@example.test",
    name: "Primeiro Acesso Sintético",
    mustChangePassword: true,
  });
  await attachTenant(database, firstAccess.id, "primeiro-acesso-51");

  const suspendedUser = await createCredentialUser(database, {
    email: "suspended-user-51@example.test",
    name: "Usuário Suspenso",
    status: "SUSPENDED",
  });
  await attachTenant(database, suspendedUser.id, "usuario-suspenso-51");

  const suspendedTenantUser = await createCredentialUser(database, {
    email: "suspended-tenant-51@example.test",
    name: "Cliente Suspenso",
  });
  await attachTenant(database, suspendedTenantUser.id, "tenant-suspenso-51", "SUSPENDED");

  const archivedTenantUser = await createCredentialUser(database, {
    email: "archived-tenant-51@example.test",
    name: "Cliente Arquivado",
  });
  await attachTenant(database, archivedTenantUser.id, "tenant-arquivado-51", "ARCHIVED");

  return [
    { email: admin.emailNormalized, expectedDestination: "/admin" },
    { email: tenantOwner.emailNormalized, expectedDestination: "/clinica-auth-51/dashboard" },
    { email: firstAccess.emailNormalized, expectedDestination: "/first-access" },
    { email: suspendedUser.emailNormalized, expectLoginDenied: true },
    { email: suspendedTenantUser.emailNormalized, expectedDestination: "/access-pending" },
    { email: archivedTenantUser.emailNormalized, expectedDestination: "/access-pending" },
  ];
}

async function callAuth(
  auth: ReturnType<typeof createAuth>,
  path: string,
  init: RequestInit = {},
  cookie?: string,
) {
  const requestHeaders = new Headers(init.headers);
  requestHeaders.set("origin", baseUrl);
  if (cookie) requestHeaders.set("cookie", cookie);
  return auth.handler(
    new Request(`${baseUrl}/api/auth${path}`, {
      ...init,
      headers: requestHeaders,
    }),
  );
}

async function signIn(auth: ReturnType<typeof createAuth>, email: string) {
  return callAuth(auth, "/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: testPassword, rememberMe: false }),
  });
}

async function readSession(auth: ReturnType<typeof createAuth>, cookie: string) {
  const response = await callAuth(auth, "/get-session", { method: "GET" }, cookie);
  if (!response.ok) return null;
  const value = (await response.json()) as { user?: { id?: string } } | null;
  return value?.user?.id ? value : null;
}

async function main() {
  const database = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireDatabaseUrl() }),
  });

  try {
    const fixtures = await seed(database);
    const auth = createAuth(database);

    for (const fixture of fixtures) {
      const response = await signIn(auth, fixture.email);
      if (fixture.expectLoginDenied) {
        if (response.ok) throw new Error("AUTH_REHEARSAL_SUSPENDED_USER_ALLOWED");
        continue;
      }
      if (!response.ok) throw new Error("AUTH_REHEARSAL_LOGIN_FAILED");

      const cookie = firstCookie(response);
      const session = await readSession(auth, cookie);
      if (!session?.user?.id) throw new Error("AUTH_REHEARSAL_SESSION_MISSING");

      const destination = await resolvePostLoginDestinationForUser(
        database,
        session.user.id,
      );
      if (destination !== fixture.expectedDestination) {
        throw new Error("AUTH_REHEARSAL_DESTINATION_MISMATCH");
      }

      const signOut = await callAuth(auth, "/sign-out", { method: "POST" }, cookie);
      if (!signOut.ok) throw new Error("AUTH_REHEARSAL_SIGN_OUT_FAILED");
      if (await readSession(auth, cookie)) {
        throw new Error("AUTH_REHEARSAL_SESSION_SURVIVED_LOGOUT");
      }
    }

    const active = fixtures.find(
      (fixture) => fixture.email === "tenant-auth-51@example.test",
    )!;
    const response = await signIn(auth, active.email);
    if (!response.ok) throw new Error("AUTH_REHEARSAL_EXPIRY_LOGIN_FAILED");
    const cookie = firstCookie(response);
    const session = await readSession(auth, cookie);
    if (!session?.user?.id) throw new Error("AUTH_REHEARSAL_EXPIRY_SESSION_MISSING");

    await database.authSession.updateMany({
      where: { userId: session.user.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    if (await readSession(auth, cookie)) {
      throw new Error("AUTH_REHEARSAL_EXPIRED_SESSION_ALLOWED");
    }

    console.info(
      JSON.stringify({
        status: "PASSED",
        profilesChecked: fixtures.length,
        logoutChecked: true,
        expiryChecked: true,
      }),
    );
  } finally {
    await database.$disconnect();
  }
}

main().catch((error: unknown) => {
  const code =
    error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "AUTH_ACCESS_REHEARSAL_FAILED";
  console.error(code);
  process.exitCode = 1;
});
