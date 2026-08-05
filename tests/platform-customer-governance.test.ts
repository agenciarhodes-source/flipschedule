import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/lib/db", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getAuth: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedSessionContext: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ structuredLog: vi.fn() }));

describe("platform customer access governance", () => {
  it("prioritizes platform administration over tenant first access", async () => {
    const { selectPostLoginDestination } = await import(
      "@/lib/auth/post-login-destination"
    );

    expect(
      selectPostLoginDestination({
        hasActivePlatformAccess: true,
        firstAccessRequired: true,
        tenantSlug: "clinica-exemplo",
      }),
    ).toBe("/admin");
  });

  it("routes clinic users through the correct access states", async () => {
    const { selectPostLoginDestination } = await import(
      "@/lib/auth/post-login-destination"
    );

    expect(
      selectPostLoginDestination({
        hasActivePlatformAccess: false,
        firstAccessRequired: true,
      }),
    ).toBe("/first-access");
    expect(
      selectPostLoginDestination({
        hasActivePlatformAccess: false,
        tenantSlug: "clinica-central",
      }),
    ).toBe("/clinica-central/dashboard");
    expect(selectPostLoginDestination({ hasActivePlatformAccess: false })).toBe(
      "/access-pending",
    );
  });

  it("validates plans and clinic client provisioning inputs", async () => {
    const { createCommercialPlanSchema, createPlatformClientSchema } = await import(
      "@/domains/infrastructure/platform/customer-service"
    );

    expect(
      createCommercialPlanSchema.parse({
        code: "CLINICA_PRO",
        name: "Clínica Pro",
        cycle: "MONTHLY",
        priceCents: 29900,
        trialDays: 7,
      }),
    ).toMatchObject({ code: "CLINICA_PRO", priceCents: 29900 });
    expect(() =>
      createCommercialPlanSchema.parse({
        code: "plano inválido",
        name: "Plano",
        cycle: "MONTHLY",
        priceCents: 100,
      }),
    ).toThrow();

    expect(() =>
      createPlatformClientSchema.parse({
        tenantName: "Clínica Teste",
        tenantSlug: "clinica-teste",
        timezone: "America/Sao_Paulo",
        locale: "pt-BR",
        ownerName: "Responsável",
        ownerEmail: "owner@example.test",
        temporaryPassword: "fraca",
        planId: "8f95c62e-aa1a-4c1d-b725-38368fb40198",
      }),
    ).toThrow();
  });

  it("keeps client creation transactional and hashes temporary credentials", () => {
    const source = readFileSync(
      "domains/infrastructure/platform/customer-service.ts",
      "utf8",
    );
    expect(source).toContain("hashPassword(data.temporaryPassword)");
    expect(source).toContain("isolationLevel: \"Serializable\"");
    expect(source).toContain("platform.client.created");
    expect(source).not.toContain("password: data.temporaryPassword");
    expect(source).toContain("endsAt: null");
    expect(source).toContain('reasonCode: "OPERATOR_PROVIDED"');
    expect(source).not.toContain("metadata: { reason: data.reason }");
  });

  it("adds a real plan catalog and subscription relation", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync(
      "prisma/migrations/20260805200000_add_commercial_plans/migration.sql",
      "utf8",
    );
    expect(schema).toContain("model CommercialPlan");
    expect(schema).toContain("commercialPlanId");
    expect(schema).toContain("enum CommercialPlanStatus");
    expect(migration).toContain('CREATE TABLE "CommercialPlan"');
    expect(migration).toContain('ALTER TABLE "Subscription" ADD COLUMN "commercialPlanId"');
  });

  it("promotes the existing account without a separate admin password", () => {
    const source = readFileSync("scripts/bootstrap-platform-owner.ts", "utf8");
    const workflow = readFileSync(
      ".github/workflows/promote-production-platform-owner.yml",
      "utf8",
    );
    expect(source).toContain("mustChangePassword: false");
    expect(source).toContain("authSession.deleteMany");
    expect(source).toContain("PLATFORM_OWNER");
    expect(workflow).toContain("BOOTSTRAP_OWNER_EMAIL");
    expect(workflow).not.toContain("BOOTSTRAP_OWNER_TEMP_PASSWORD");
  });

  it("exposes clients and plans in the admin panel", () => {
    const layout = readFileSync(
      "app/(platform-admin)/admin/layout.tsx",
      "utf8",
    );
    const clients = readFileSync(
      "app/(platform-admin)/admin/clients/page.tsx",
      "utf8",
    );
    expect(layout).toContain("/admin/clients");
    expect(layout).toContain("/admin/plans");
    expect(clients).toContain("Adicionar clínica cliente");
    expect(clients).toContain("Senha temporária");
    expect(clients).toContain("ARCHIVED");
  });
});
