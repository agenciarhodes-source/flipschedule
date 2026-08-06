import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("platform subscription operations", () => {
  it("normalizes subscription directory filters", async () => {
    const { platformSubscriptionDirectoryQuerySchema } = await import(
      "@/domains/infrastructure/platform/subscription-directory-reader"
    );

    expect(
      platformSubscriptionDirectoryQuerySchema.parse({
        page: "2",
        q: "  Clínica Pro  ",
        status: "PAST_DUE",
        provider: "ASAAS",
      }),
    ).toEqual({
      page: 2,
      q: "Clínica Pro",
      status: "PAST_DUE",
      provider: "ASAAS",
    });
    expect(
      platformSubscriptionDirectoryQuerySchema.parse({
        page: "invalid",
        status: "UNKNOWN",
        provider: "UNKNOWN",
      }),
    ).toEqual({ page: 1, q: "", status: "ALL", provider: "ALL" });
  });

  it("validates manual subscription status changes", async () => {
    const { changeManualSubscriptionStatusSchema } = await import(
      "@/domains/infrastructure/platform/subscription-service"
    );

    expect(
      changeManualSubscriptionStatusSchema.parse({
        subscriptionId: "8f95c62e-aa1a-4c1d-b725-38368fb40198",
        status: "SUSPENDED",
        reason: "Solicitação operacional confirmada",
      }),
    ).toMatchObject({ status: "SUSPENDED", confirmation: "" });
    expect(() =>
      changeManualSubscriptionStatusSchema.parse({
        subscriptionId: "invalid",
        status: "ACTIVE",
        reason: "curto",
      }),
    ).toThrow();
  });

  it("keeps external subscriptions read-only and synchronizes paid access", () => {
    const service = readFileSync(
      "domains/infrastructure/platform/subscription-service.ts",
      "utf8",
    );

    expect(service).toContain('subscription.provider !== "MANUAL"');
    expect(service).toContain("EXTERNAL_SUBSCRIPTION_READ_ONLY");
    expect(service).toContain("CANCELAR ASSINATURA");
    expect(service).toContain('type: "PAID"');
    expect(service).toContain("accessEntitlement.updateMany");
    expect(service).toContain("accessEntitlement.create");
    expect(service).toContain('isolationLevel: "Serializable"');
    expect(service).toContain("previousStatus");
    expect(service).toContain("nextStatus");
    expect(service).not.toContain("metadata: { reason: data.reason }");
  });

  it("replaces the raw JSON page with a functional sanitized view", () => {
    const page = readFileSync(
      "app/(platform-admin)/admin/subscriptions/page.tsx",
      "utf8",
    );
    const reader = readFileSync(
      "domains/infrastructure/platform/subscription-directory-reader.ts",
      "utf8",
    );
    const actions = readFileSync(
      "app/(platform-admin)/admin/subscriptions/actions.ts",
      "utf8",
    );

    expect(page).toContain("Assinaturas da plataforma");
    expect(page).toContain("Pagamentos vencidos");
    expect(page).toContain("Acessos vigentes");
    expect(page).toContain("changeManualSubscriptionStatusAction");
    expect(page).not.toContain("JSON.stringify");
    expect(reader).not.toContain("externalCustomerId");
    expect(reader).not.toContain("externalSubscriptionId");
    expect(reader).not.toContain("externalPaymentId");
    expect(actions.startsWith('"use server"')).toBe(true);
    expect(actions).toContain('revalidatePath("/admin/clients")');
  });
});
