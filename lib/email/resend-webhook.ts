import "server-only";

import { Webhook } from "svix";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/client";
import { structuredLog } from "@/lib/observability/logger";
import { getResendWebhookConfiguration } from "./config";

const resendEventSchema = z.object({
  type: z.string().trim().min(1).max(100),
  created_at: z.string().datetime(),
  data: z.object({ email_id: z.string().trim().min(1).max(256) }).passthrough(),
}).passthrough();

export type VerifiedResendEvent = z.infer<typeof resendEventSchema>;

export class ResendWebhookError extends Error {
  override name = "ResendWebhookError";

  constructor(public readonly code: "WEBHOOK_CONFIGURATION_INVALID" | "WEBHOOK_SIGNATURE_INVALID" | "WEBHOOK_PAYLOAD_INVALID") {
    super("O webhook de e-mail não pôde ser processado.");
  }
}

export function verifyResendWebhook(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  env: Record<string, string | undefined> = process.env,
): VerifiedResendEvent {
  if (!headers.id || !headers.timestamp || !headers.signature) {
    throw new ResendWebhookError("WEBHOOK_SIGNATURE_INVALID");
  }

  let secret: string;
  try {
    secret = getResendWebhookConfiguration(env).webhookSecret;
  } catch {
    throw new ResendWebhookError("WEBHOOK_CONFIGURATION_INVALID");
  }

  let verified: unknown;
  try {
    verified = new Webhook(secret).verify(payload, {
      "svix-id": headers.id,
      "svix-timestamp": headers.timestamp,
      "svix-signature": headers.signature,
    });
  } catch {
    throw new ResendWebhookError("WEBHOOK_SIGNATURE_INVALID");
  }

  const parsed = resendEventSchema.safeParse(verified);
  if (!parsed.success) throw new ResendWebhookError("WEBHOOK_PAYLOAD_INVALID");
  return parsed.data;
}

const statusRank: Record<string, number> = {
  PENDING: 0,
  SENT: 10,
  DELIVERY_DELAYED: 20,
  DELIVERED: 30,
  FAILED: 40,
  BOUNCED: 50,
  COMPLAINED: 60,
  SUPPRESSED: 60,
};

export type ResendDeliveryTransition = {
  status: "SENT" | "DELIVERED" | "DELIVERY_DELAYED" | "BOUNCED" | "COMPLAINED" | "SUPPRESSED" | "FAILED";
  timestampField: "sentAt" | "deliveredAt" | "delayedAt" | "bouncedAt" | "complainedAt" | "suppressedAt" | "failedAt";
  suppressionReason?: "BOUNCED" | "COMPLAINED" | "SUPPRESSED";
  failureCode?: string;
};

export function mapResendEventType(type: string): ResendDeliveryTransition | null {
  const transitions: Record<string, ResendDeliveryTransition> = {
    "email.sent": { status: "SENT", timestampField: "sentAt" },
    "email.delivered": { status: "DELIVERED", timestampField: "deliveredAt" },
    "email.delivery_delayed": { status: "DELIVERY_DELAYED", timestampField: "delayedAt" },
    "email.bounced": { status: "BOUNCED", timestampField: "bouncedAt", suppressionReason: "BOUNCED", failureCode: "EMAIL_BOUNCED" },
    "email.complained": { status: "COMPLAINED", timestampField: "complainedAt", suppressionReason: "COMPLAINED", failureCode: "EMAIL_COMPLAINED" },
    "email.suppressed": { status: "SUPPRESSED", timestampField: "suppressedAt", suppressionReason: "SUPPRESSED", failureCode: "EMAIL_SUPPRESSED" },
    "email.failed": { status: "FAILED", timestampField: "failedAt", failureCode: "EMAIL_DELIVERY_FAILED" },
  };
  return transitions[type] ?? null;
}

export function shouldApplyResendTransition(input: {
  currentStatus: string;
  currentEventAt: Date | null;
  nextStatus: string;
  nextEventAt: Date;
}) {
  if (input.currentEventAt && input.nextEventAt.getTime() < input.currentEventAt.getTime()) return false;
  return (statusRank[input.nextStatus] ?? -1) >= (statusRank[input.currentStatus] ?? -1);
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function processResendWebhook(event: VerifiedResendEvent, providerEventId: string) {
  const prisma = getPrismaClient();
  const eventAt = new Date(event.created_at);
  const providerMessageId = event.data.email_id;
  let duplicate = false;

  try {
    await prisma.transactionalEmailWebhookEvent.create({
      data: {
        provider: "resend",
        providerEventId,
        eventType: event.type,
        providerMessageId,
        eventOccurredAt: eventAt,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    duplicate = true;
    const existing = await prisma.transactionalEmailWebhookEvent.findUnique({
      where: { providerEventId },
      select: {
        eventType: true,
        providerMessageId: true,
        eventOccurredAt: true,
        processedAt: true,
      },
    });
    if (!existing) throw error;
    const sameEvent =
      existing.eventType === event.type &&
      existing.providerMessageId === providerMessageId &&
      existing.eventOccurredAt?.getTime() === eventAt.getTime();
    if (!sameEvent) {
      structuredLog("error", "email.webhook.conflict", {
        provider: "resend",
        errorCode: "WEBHOOK_EVENT_ID_CONFLICT",
      });
      throw new ResendWebhookError("WEBHOOK_PAYLOAD_INVALID");
    }
    if (existing.processedAt) {
      structuredLog("info", "email.webhook.duplicate", { provider: "resend", status: "DUPLICATE" });
      return { duplicate: true as const };
    }
    structuredLog("warn", "email.webhook.retry_pending", {
      provider: "resend",
      status: "RETRY_PENDING",
    });
  }

  const transition = mapResendEventType(event.type);
  await prisma.$transaction(async (tx) => {
    const delivery = await tx.transactionalEmailDelivery.findUnique({
      where: { providerMessageId },
      select: {
        id: true,
        recipientFingerprint: true,
        status: true,
        lastEventAt: true,
      },
    });

    if (!delivery) {
      await tx.transactionalEmailWebhookEvent.update({
        where: { providerEventId },
        data: { processedAt: new Date(), failureCode: "EMAIL_DELIVERY_NOT_FOUND" },
      });
      return;
    }

    if (!transition) {
      await tx.transactionalEmailWebhookEvent.update({
        where: { providerEventId },
        data: { processedAt: new Date(), failureCode: "EMAIL_EVENT_UNSUPPORTED" },
      });
      return;
    }

    if (!shouldApplyResendTransition({
      currentStatus: delivery.status,
      currentEventAt: delivery.lastEventAt,
      nextStatus: transition.status,
      nextEventAt: eventAt,
    })) {
      await tx.transactionalEmailWebhookEvent.update({
        where: { providerEventId },
        data: { processedAt: new Date(), failureCode: "EMAIL_EVENT_OUT_OF_ORDER" },
      });
      return;
    }

    await tx.transactionalEmailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: transition.status,
        lastEventAt: eventAt,
        failureCode: transition.failureCode ?? null,
        [transition.timestampField]: eventAt,
      },
    });

    if (transition.suppressionReason) {
      await tx.emailSuppression.upsert({
        where: {
          recipientFingerprint_provider: {
            recipientFingerprint: delivery.recipientFingerprint,
            provider: "resend",
          },
        },
        create: {
          recipientFingerprint: delivery.recipientFingerprint,
          provider: "resend",
          reason: transition.suppressionReason,
        },
        update: {
          reason: transition.suppressionReason,
          liftedAt: null,
        },
      });
    }

    await tx.transactionalEmailWebhookEvent.update({
      where: { providerEventId },
      data: { processedAt: new Date(), failureCode: null },
    });
  });

  structuredLog("info", "email.webhook.processed", {
    provider: "resend",
    status: transition?.status ?? "IGNORED",
  });
  return { duplicate };
}
