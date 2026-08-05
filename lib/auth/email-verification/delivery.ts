import "server-only";

import { createHash } from "node:crypto";

import { renderAccountEmailVerification } from "@/lib/email/templates/email-verification";
import { sendTransactionalEmail } from "@/lib/email/service";

const verificationExpiresInMinutes = 60;

export function buildEmailVerificationDeliveryReference(token: string) {
  return createHash("sha256").update(`email-verification:${token}`).digest("hex");
}

export async function deliverAccountEmailVerification(input: {
  recipientEmail: string;
  verificationUrl: string;
  token: string;
}) {
  const rendered = renderAccountEmailVerification({
    verificationUrl: input.verificationUrl,
    expiresInMinutes: verificationExpiresInMinutes,
  });
  return sendTransactionalEmail({
    kind: "EMAIL_VERIFICATION",
    deliveryReference: buildEmailVerificationDeliveryReference(input.token),
    recipientEmail: input.recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}
