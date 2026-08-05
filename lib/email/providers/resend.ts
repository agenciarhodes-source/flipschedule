import "server-only";

import { assertExternalEffectAllowed, ExternalEffectDisabledError } from "@/lib/runtime/external-effects";
import type { ResendEmailConfiguration } from "../config";
import {
  TransactionalEmailError,
  type TransactionalEmailMessage,
  type TransactionalEmailProvider,
  type TransactionalEmailSendResult,
} from "../contract";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

type FetchImplementation = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class ResendTransactionalEmailProvider implements TransactionalEmailProvider {
  constructor(
    private readonly configuration: ResendEmailConfiguration,
    private readonly env: Record<string, string | undefined> = process.env,
    private readonly fetchImplementation: FetchImplementation = fetch,
  ) {}

  async send(message: TransactionalEmailMessage): Promise<TransactionalEmailSendResult> {
    try {
      assertExternalEffectAllowed("sandbox", this.env);
    } catch (error) {
      if (error instanceof ExternalEffectDisabledError) {
        throw new TransactionalEmailError("EMAIL_EXTERNAL_EFFECTS_DISABLED");
      }
      throw error;
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(RESEND_EMAILS_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.configuration.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": message.idempotencyKey,
          "user-agent": "FlipSchedule/0.1 transactional-email",
        },
        body: JSON.stringify({
          from: this.configuration.from,
          to: [message.recipientEmail],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new TransactionalEmailError("EMAIL_PROVIDER_REQUEST_FAILED");
    }

    if (!response.ok) {
      throw new TransactionalEmailError("EMAIL_PROVIDER_REQUEST_FAILED", response.status);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new TransactionalEmailError("EMAIL_PROVIDER_RESPONSE_INVALID", response.status);
    }

    const providerMessageId =
      typeof data === "object" && data !== null && "id" in data && typeof data.id === "string"
        ? data.id.trim()
        : "";
    if (!providerMessageId || providerMessageId.length > 256) {
      throw new TransactionalEmailError("EMAIL_PROVIDER_RESPONSE_INVALID", response.status);
    }

    return { provider: "resend", providerMessageId };
  }
}
