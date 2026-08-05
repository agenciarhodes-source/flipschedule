import "server-only";

import { sendTransactionalEmail } from "@/lib/email/service";
import { renderPasswordResetEmail } from "@/lib/email/templates/password-reset";

export interface PasswordResetDelivery {
  sendPasswordReset(input: {
    recipientEmail: string;
    resetUrl: string;
    expiresAt: Date;
    deliveryReference: string;
  }): Promise<void>;
}

export class PasswordResetDeliveryUnavailableError extends Error {
  override name = "PasswordResetDeliveryUnavailableError";
}

class TransactionalPasswordResetDelivery implements PasswordResetDelivery {
  async sendPasswordReset(input: {
    recipientEmail: string;
    resetUrl: string;
    expiresAt: Date;
    deliveryReference: string;
  }): Promise<void> {
    const message = renderPasswordResetEmail({ resetUrl: input.resetUrl, expiresAt: input.expiresAt });
    try {
      await sendTransactionalEmail({
        kind: "PASSWORD_RESET",
        deliveryReference: input.deliveryReference,
        recipientEmail: input.recipientEmail,
        ...message,
      });
    } catch {
      throw new PasswordResetDeliveryUnavailableError("PASSWORD_RESET_DELIVERY_UNAVAILABLE");
    }
  }
}

let testDelivery: PasswordResetDelivery | null = null;

export function setPasswordResetDeliveryForTesting(delivery: PasswordResetDelivery | null) {
  testDelivery = delivery;
}

export function getPasswordResetDelivery(): PasswordResetDelivery {
  return testDelivery ?? new TransactionalPasswordResetDelivery();
}
