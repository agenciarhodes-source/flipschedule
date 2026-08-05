import "server-only";

import { normalizeEmail } from "@/lib/auth/utils";
import { getPrismaClient } from "@/lib/db/client";
import { structuredLog } from "@/lib/observability/logger";
import { getTransactionalEmailConfiguration } from "./config";
import {
  TransactionalEmailError,
  getTransactionalEmailErrorCode,
  type TransactionalEmailKind,
} from "./contract";
import { fingerprintEmailAddress } from "./fingerprint";
import { getTransactionalEmailProvider } from "./provider";

export type SendTransactionalEmailInput = {
  kind: TransactionalEmailKind;
  deliveryReference: string;
  recipientEmail: string;
  subject: string;
  html: string;
  text: string;
};

const resumableStatuses = new Set(["PENDING", "FAILED"]);

function buildIdempotencyKey(input: Pick<SendTransactionalEmailInput, "kind" | "deliveryReference">) {
  const namespace = input.kind === "PASSWORD_RESET" ? "password-reset" : "transactional-email";
  return `${namespace}/${input.deliveryReference}`.slice(0, 256);
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
  env: Record<string, string | undefined> = process.env,
) {
  const configuration = getTransactionalEmailConfiguration(env);
  if (configuration.provider === "disabled") {
    throw new TransactionalEmailError("EMAIL_PROVIDER_DISABLED");
  }

  const prisma = getPrismaClient();
  const provider = getTransactionalEmailProvider(env);
  const recipientEmail = normalizeEmail(input.recipientEmail);
  const recipientFingerprint = fingerprintEmailAddress(recipientEmail, configuration.recipientHashKey);
  const idempotencyKey = buildIdempotencyKey(input);

  const suppression = await prisma.emailSuppression.findUnique({
    where: {
      recipientFingerprint_provider: {
        recipientFingerprint,
        provider: configuration.provider,
      },
    },
    select: { liftedAt: true },
  });

  const delivery = await prisma.transactionalEmailDelivery.upsert({
    where: { idempotencyKey },
    create: {
      passwordResetTokenId: input.kind === "PASSWORD_RESET" ? input.deliveryReference : null,
      kind: input.kind,
      provider: configuration.provider,
      idempotencyKey,
      recipientFingerprint,
      status: suppression && !suppression.liftedAt ? "SUPPRESSED" : "PENDING",
      suppressedAt: suppression && !suppression.liftedAt ? new Date() : null,
      failureCode: suppression && !suppression.liftedAt ? "EMAIL_RECIPIENT_SUPPRESSED" : null,
    },
    update: { idempotencyKey },
    select: { id: true, status: true, providerMessageId: true },
  });

  if (suppression && !suppression.liftedAt) {
    structuredLog("warn", "email.password_reset.suppressed", {
      provider: configuration.provider,
      resourceType: "TransactionalEmailDelivery",
      resourceId: delivery.id,
      errorCode: "EMAIL_RECIPIENT_SUPPRESSED",
    });
    throw new TransactionalEmailError("EMAIL_RECIPIENT_SUPPRESSED");
  }

  if (delivery.providerMessageId && !resumableStatuses.has(delivery.status)) {
    return { provider: configuration.provider, providerMessageId: delivery.providerMessageId } as const;
  }

  structuredLog("info", "email.password_reset.send_started", {
    provider: configuration.provider,
    resourceType: "TransactionalEmailDelivery",
    resourceId: delivery.id,
    status: "PENDING",
  });

  try {
    const result = await provider.send({
      kind: input.kind,
      recipientEmail,
      subject: input.subject,
      html: input.html,
      text: input.text,
      idempotencyKey,
      ...(configuration.replyTo ? { replyTo: configuration.replyTo } : {}),
    });
    const sentAt = new Date();
    await prisma.transactionalEmailDelivery.update({
      where: { id: delivery.id },
      data: {
        providerMessageId: result.providerMessageId,
        status: "SENT",
        sentAt,
        lastEventAt: sentAt,
        failureCode: null,
      },
    });
    structuredLog("info", "email.password_reset.sent", {
      provider: result.provider,
      resourceType: "TransactionalEmailDelivery",
      resourceId: delivery.id,
      status: "SENT",
    });
    return result;
  } catch (error) {
    const errorCode = getTransactionalEmailErrorCode(error);
    await prisma.transactionalEmailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", failedAt: new Date(), failureCode: errorCode },
    });
    structuredLog("warn", "email.password_reset.send_failed", {
      provider: configuration.provider,
      resourceType: "TransactionalEmailDelivery",
      resourceId: delivery.id,
      errorCode,
    });
    throw error instanceof TransactionalEmailError
      ? error
      : new TransactionalEmailError("EMAIL_PROVIDER_REQUEST_FAILED");
  }
}
