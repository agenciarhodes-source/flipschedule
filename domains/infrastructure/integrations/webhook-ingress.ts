import "server-only";

import type { IntegrationProvider, PrismaClient } from "@/generated/prisma/client";
import { createCorrelationId, payloadHash, ProviderRegistry } from "@/domains/application/integrations";
import { resolveAsaasBillingWebhookTenant } from "@/domains/infrastructure/billing/asaas-webhook-routing";
import { encryptField } from "@/lib/security/field-encryption";

const providers = new Set<IntegrationProvider>([
  "WHATSAPP",
  "INSTAGRAM",
  "MESSENGER",
  "FACEBOOK_LEADS",
  "ASAAS",
  "EMAIL",
]);

export const MAX_WEBHOOK_BYTES = 256_000;

export function parseProvider(value: string) {
  const normalized = value.toUpperCase().replaceAll("-", "_") as IntegrationProvider;
  return providers.has(normalized) ? normalized : null;
}

export class WebhookIngressService {
  constructor(
    private prisma: PrismaClient,
    private registry: ProviderRegistry,
  ) {}

  async accept(
    provider: IntegrationProvider,
    headers: Readonly<Record<string, string>>,
    rawBody: Uint8Array,
  ) {
    const adapter = this.registry.find(provider);
    if (!adapter) return { status: 404 as const };

    const verified = await adapter.verifyWebhook({ provider, headers, rawBody, receivedAt: new Date() });
    if (!verified.valid) return { status: 401 as const };

    let tenantId: string;
    if (provider === "ASAAS") {
      const billingRoute = await resolveAsaasBillingWebhookTenant(this.prisma, rawBody);
      if (billingRoute.authoritative) {
        if (!billingRoute.tenantId) return { status: 400 as const };
        tenantId = billingRoute.tenantId;
      } else {
        const integrations = await this.prisma.integration.findMany({
          where: {
            provider,
            status: "CONNECTED",
            externalAccountId: verified.webhook.integrationExternalAccountId,
          },
          select: { id: true, tenantId: true },
          take: 2,
        });
        if (integrations.length !== 1) return { status: 400 as const };
        tenantId = integrations[0]!.tenantId;
      }
    } else {
      const integrations = await this.prisma.integration.findMany({
        where: {
          provider,
          status: "CONNECTED",
          externalAccountId: verified.webhook.integrationExternalAccountId,
        },
        select: { id: true, tenantId: true },
        take: 2,
      });
      if (integrations.length !== 1) return { status: 400 as const };
      tenantId = integrations[0]!.tenantId;
    }

    const hash = payloadHash(rawBody);
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { provider_externalEventId: { provider, externalEventId: verified.webhook.externalEventId } },
      select: { payloadHash: true },
    });
    if (existing) {
      if (existing.payloadHash !== hash) {
        await this.prisma.webhookEvent.update({
          where: {
            provider_externalEventId: {
              provider,
              externalEventId: verified.webhook.externalEventId,
            },
          },
          data: { status: "FAILED", nextAttemptAt: null, lastErrorCode: "PAYLOAD_HASH_MISMATCH" },
        });
      }
      return { status: 200 as const, conflict: existing.payloadHash !== hash };
    }

    let ciphertext: string;
    try {
      ciphertext = encryptField(new TextDecoder().decode(rawBody));
    } catch {
      return { status: 500 as const };
    }

    try {
      await this.prisma.webhookEvent.create({
        data: {
          tenantId,
          provider,
          externalEventId: verified.webhook.externalEventId,
          payloadHash: hash,
          payloadCiphertext: ciphertext,
          status: "RECEIVED",
          receivedAt: new Date(),
          nextAttemptAt: new Date(),
          correlationId: createCorrelationId(),
        },
      });
      return { status: 202 as const };
    } catch {
      return { status: 500 as const };
    }
  }
}
