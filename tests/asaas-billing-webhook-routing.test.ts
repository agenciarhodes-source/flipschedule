import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

import { AsaasWebhookAdapter } from "@/domains/infrastructure/billing/asaas-webhook-adapter";
import {
  readAsaasBillingRoutingHints,
  resolveAsaasBillingWebhookTenant,
} from "@/domains/infrastructure/billing/asaas-webhook-routing";

const body = (payload: unknown) => new TextEncoder().encode(JSON.stringify(payload));

describe("shared Asaas billing webhook routing", () => {
  it("extracts opaque routing identifiers without exposing tenant ids", () => {
    expect(
      readAsaasBillingRoutingHints(
        body({ checkout: { id: "chk_1", externalReference: "fs_opaque" } }),
      ),
    ).toMatchObject({
      authoritative: true,
      kind: "checkout",
      externalCheckoutId: "chk_1",
      externalReference: "fs_opaque",
    });
    expect(
      readAsaasBillingRoutingHints(body({ payment: { id: "pay_1", subscription: "sub_1" } })),
    ).toMatchObject({
      authoritative: true,
      kind: "payment",
      externalPaymentId: "pay_1",
      externalSubscriptionId: "sub_1",
    });
  });

  it("resolves checkout and subscription references to exactly one tenant", async () => {
    const db = {
      billingCheckout: { findMany: vi.fn().mockResolvedValue([{ tenantId: "tenant-a" }]) },
      subscription: { findMany: vi.fn().mockResolvedValue([{ tenantId: "tenant-a" }]) },
      payment: { findMany: vi.fn().mockResolvedValue([]) },
      commercialOnboardingIntent: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    await expect(
      resolveAsaasBillingWebhookTenant(
        db,
        body({ checkout: { id: "chk_1", externalReference: "fs_opaque" } }),
      ),
    ).resolves.toEqual({ authoritative: true, tenantId: "tenant-a", onboardingIntentId: null });

    await expect(
      resolveAsaasBillingWebhookTenant(
        db,
        body({ subscription: { id: "sub_1", externalReference: "fs_opaque" } }),
      ),
    ).resolves.toEqual({ authoritative: true, tenantId: "tenant-a", onboardingIntentId: null });
  });

  it("fails closed when provider identifiers point at more than one tenant", async () => {
    const db = {
      billingCheckout: { findMany: vi.fn().mockResolvedValue([{ tenantId: "tenant-a" }]) },
      subscription: { findMany: vi.fn().mockResolvedValue([{ tenantId: "tenant-b" }]) },
      payment: { findMany: vi.fn().mockResolvedValue([]) },
      commercialOnboardingIntent: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    await expect(
      resolveAsaasBillingWebhookTenant(
        db,
        body({ subscription: { id: "sub_1", externalReference: "fs_opaque" } }),
      ),
    ).resolves.toEqual({ authoritative: true, tenantId: null, onboardingIntentId: null });
  });

  it("accepts a signed shared billing webhook even when no tenant-specific account id is present", async () => {
    const rawBody = body({
      id: "evt_1",
      event: "CHECKOUT_CREATED",
      checkout: { id: "chk_1", externalReference: "fs_opaque" },
    });
    const result = await new AsaasWebhookAdapter("secret-token").verifyWebhook({
      provider: "ASAAS",
      headers: { "asaas-access-token": "secret-token" },
      rawBody,
      receivedAt: new Date(),
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.webhook.integrationExternalAccountId).toBe("shared-billing");
  });

  it("uses authoritative billing routing before the legacy integration-account fallback", () => {
    const ingress = readFileSync(
      "domains/infrastructure/integrations/webhook-ingress.ts",
      "utf8",
    );
    expect(ingress).toContain("resolveAsaasBillingWebhookTenant(this.prisma, rawBody)");
    expect(ingress).toContain("if (billingRoute.authoritative)");
    expect(ingress).toContain(
      "if (!billingRoute.tenantId && !billingRoute.onboardingIntentId) return { status: 400 as const }",
    );
    expect(ingress).toContain("tenantId = billingRoute.tenantId");
  });
});
