import "server-only";

export type TransactionalEmailKind = "PASSWORD_RESET" | "EMAIL_VERIFICATION";
export type TransactionalEmailProviderName = "resend";

export type TransactionalEmailMessage = {
  kind: TransactionalEmailKind;
  recipientEmail: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  replyTo?: string;
};

export type TransactionalEmailSendResult = {
  provider: TransactionalEmailProviderName;
  providerMessageId: string;
};

export interface TransactionalEmailProvider {
  send(message: TransactionalEmailMessage): Promise<TransactionalEmailSendResult>;
}

export type TransactionalEmailErrorCode =
  | "EMAIL_PROVIDER_DISABLED"
  | "EMAIL_PROVIDER_MISCONFIGURED"
  | "EMAIL_EXTERNAL_EFFECTS_DISABLED"
  | "EMAIL_RECIPIENT_SUPPRESSED"
  | "EMAIL_PROVIDER_REQUEST_FAILED"
  | "EMAIL_PROVIDER_RESPONSE_INVALID";

export class TransactionalEmailError extends Error {
  override name = "TransactionalEmailError";

  constructor(
    public readonly code: TransactionalEmailErrorCode,
    public readonly providerStatus?: number,
  ) {
    super("A entrega transacional de e-mail não está disponível.");
  }
}

export function getTransactionalEmailErrorCode(error: unknown): TransactionalEmailErrorCode {
  return error instanceof TransactionalEmailError ? error.code : "EMAIL_PROVIDER_REQUEST_FAILED";
}
