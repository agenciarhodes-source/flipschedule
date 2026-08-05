import "server-only";

export interface PasswordResetDelivery {
  sendPasswordReset(input: { recipientEmail: string; resetUrl: string; expiresAt: Date }): Promise<void>;
}

export class PasswordResetDeliveryUnavailableError extends Error {
  override name = "PasswordResetDeliveryUnavailableError";
}

class DisabledPasswordResetDelivery implements PasswordResetDelivery {
  async sendPasswordReset(): Promise<void> { throw new PasswordResetDeliveryUnavailableError("PASSWORD_RESET_DELIVERY_DISABLED"); }
}

let testDelivery: PasswordResetDelivery | null = null;
export function setPasswordResetDeliveryForTesting(delivery: PasswordResetDelivery | null) { testDelivery = delivery; }
export function getPasswordResetDelivery(): PasswordResetDelivery { return testDelivery ?? new DisabledPasswordResetDelivery(); }
