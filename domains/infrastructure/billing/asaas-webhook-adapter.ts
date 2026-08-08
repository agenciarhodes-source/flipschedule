import "server-only";

import { timingSafeEqual } from "node:crypto";
import {
  ProviderPermanentError,
  type IntegrationProviderAdapter,
  type ProviderEvent,
  type ProviderWebhookRequest,
  type VerifiedProviderWebhook,
} from "@/domains/application/integrations";
import { checkoutEventStatus, paymentEventStatus } from "@/domains/application/billing";
import { readAsaasBillingRoutingHints } from "./asaas-webhook-routing";

type Payload = {
  event?: unknown;
  checkout?: Record<string, unknown>;
  subscription?: Record<string, unknown>;
  payment?: Record<string, unknown>;
};

const cents = (value: unknown) => Math.round(Number(value) * 100);
const date = (value: unknown) => new Date(`${String(value)}T12:00:00Z`);

export class AsaasWebhookAdapter implements IntegrationProviderAdapter {
  readonly provider = "ASAAS" as const;

  constructor(
    private readonly webhookToken =
      process.env.ASAAS_WEBHOOK_TOKEN?.trim() || process.env.ASAAS_WEBHOOK_SECRET?.trim(),
  ) {}

  supportsChannel() {
    return false;
  }

  async validateConfiguration() {
    return this.webhookToken
      ? ({ valid: true as const, configuration: { environment: "sandbox" } } as const)
      : ({ valid: false as const, errorCode: "PROVIDER_CONFIGURATION_INVALID" } as const);
  }

  async healthCheck() {
    return { healthy: false as const, errorCode: "BILLING_HEALTHCHECK_SEPARATE" };
  }

  async verifyWebhook(request: ProviderWebhookRequest) {
    const received = request.headers["asaas-access-token"];
    if (!this.webhookToken || !received) {
      return { valid: false as const, errorCode: "WEBHOOK_TOKEN_INVALID" };
    }
    const left = Buffer.from(this.webhookToken);
    const right = Buffer.from(received);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return { valid: false as const, errorCode: "WEBHOOK_TOKEN_INVALID" };
    }

    try {
      const payload = JSON.parse(new TextDecoder().decode(request.rawBody)) as {
        id?: unknown;
        account?: { id?: unknown };
        walletId?: unknown;
      };
      const externalEventId = String(payload.id ?? "");
      const integrationExternalAccountId = String(payload.account?.id ?? payload.walletId ?? "");
      const billingHints = readAsaasBillingRoutingHints(request.rawBody);
      if (!externalEventId || (!integrationExternalAccountId && !billingHints.authoritative)) {
        return { valid: false as const, errorCode: "WEBHOOK_PAYLOAD_INVALID" };
      }
      return {
        valid: true as const,
        webhook: {
          ...request,
          externalEventId,
          integrationExternalAccountId: integrationExternalAccountId || "shared-billing",
        },
      };
    } catch {
      return { valid: false as const, errorCode: "WEBHOOK_PAYLOAD_INVALID" };
    }
  }

  async parseWebhook(request: VerifiedProviderWebhook): Promise<ProviderEvent[]> {
    let payload: Payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(request.rawBody)) as Payload;
    } catch {
      throw new ProviderPermanentError("WEBHOOK_PAYLOAD_INVALID");
    }
    const name = String(payload.event ?? "");

    if (name in checkoutEventStatus) {
      const row = payload.checkout ?? {};
      const id = String(row.id ?? "");
      if (!id) throw new ProviderPermanentError("WEBHOOK_PAYLOAD_INVALID");
      return [
        {
          type: "BillingCheckoutChanged",
          externalCheckoutId: id,
          ...(row.externalReference ? { externalReference: String(row.externalReference) } : {}),
          status: checkoutEventStatus[name as keyof typeof checkoutEventStatus],
        },
      ];
    }

    const subscriptionMap = {
      SUBSCRIPTION_CREATED: "PENDING",
      SUBSCRIPTION_UPDATED: "ACTIVE",
      SUBSCRIPTION_INACTIVATED: "SUSPENDED",
      SUBSCRIPTION_DELETED: "CANCELLED",
    } as const;
    if (name in subscriptionMap) {
      const row = payload.subscription ?? {};
      const id = String(row.id ?? "");
      if (!id) throw new ProviderPermanentError("WEBHOOK_PAYLOAD_INVALID");
      return [
        {
          type: "BillingSubscriptionChanged",
          externalSubscriptionId: id,
          ...(row.externalReference ? { externalReference: String(row.externalReference) } : {}),
          ...(row.customer ? { externalCustomerId: String(row.customer) } : {}),
          ...(row.billingType ? { billingType: String(row.billingType) } : {}),
          providerStatus: String(row.status ?? name),
          status: subscriptionMap[name as keyof typeof subscriptionMap],
        },
      ];
    }

    if (name in paymentEventStatus) {
      const row = payload.payment ?? {};
      const id = String(row.id ?? "");
      if (!id || !Number.isFinite(Number(row.value)) || !row.dueDate) {
        throw new ProviderPermanentError("WEBHOOK_PAYLOAD_INVALID");
      }
      return [
        {
          type: "BillingPaymentChanged",
          externalPaymentId: id,
          ...(row.subscription ? { externalSubscriptionId: String(row.subscription) } : {}),
          providerStatus: String(row.status ?? name),
          status: paymentEventStatus[name as keyof typeof paymentEventStatus],
          amountCents: cents(row.value),
          dueAt: date(row.dueDate),
          ...(row.paymentDate ? { paidAt: date(row.paymentDate) } : {}),
        },
      ];
    }

    throw new ProviderPermanentError("WEBHOOK_EVENT_UNSUPPORTED");
  }

  async sendMessage() {
    return { ok: false as const, errorCode: "CHANNEL_UNSUPPORTED", temporary: false };
  }
}
