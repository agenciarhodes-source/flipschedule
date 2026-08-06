import "server-only";

import { z } from "zod";

import { TransactionalEmailError } from "./contract";

export type DisabledEmailConfiguration = {
  provider: "disabled";
};

export type ResendEmailConfiguration = {
  provider: "resend";
  apiKey: string;
  from: string;
  replyTo?: string;
  webhookSecret?: string;
  recipientHashKey: string;
};

export type TransactionalEmailConfiguration = DisabledEmailConfiguration | ResendEmailConfiguration;

const mailboxPattern = /^(?:[^<>\r\n]{1,100}\s*)?<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$|^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/;
const emailPattern = /^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/;

const resendSchema = z
  .object({
    apiKey: z.string().trim().min(20).max(512),
    from: z.string().trim().min(3).max(320).regex(mailboxPattern),
    replyTo: z.string().trim().max(254).regex(emailPattern).optional(),
    webhookSecret: z.string().trim().min(20).max(512).optional(),
    recipientHashKey: z.string().min(32).max(512),
  })
  .strict();

export function getTransactionalEmailConfiguration(
  env: Record<string, string | undefined> = process.env,
): TransactionalEmailConfiguration {
  const provider = (env.EMAIL_PROVIDER ?? "disabled").trim().toLowerCase();
  if (provider === "disabled") return { provider: "disabled" };
  if (provider !== "resend") throw new TransactionalEmailError("EMAIL_PROVIDER_MISCONFIGURED");

  const parsed = resendSchema.safeParse({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO?.trim() || undefined,
    webhookSecret: env.RESEND_WEBHOOK_SECRET?.trim() || undefined,
    recipientHashKey: env.EMAIL_RECIPIENT_HASH_KEY,
  });

  if (!parsed.success) throw new TransactionalEmailError("EMAIL_PROVIDER_MISCONFIGURED");
  return {
    provider: "resend",
    apiKey: parsed.data.apiKey,
    from: parsed.data.from,
    recipientHashKey: parsed.data.recipientHashKey,
    ...(parsed.data.replyTo ? { replyTo: parsed.data.replyTo } : {}),
    ...(parsed.data.webhookSecret ? { webhookSecret: parsed.data.webhookSecret } : {}),
  };
}

export function getResendWebhookConfiguration(
  env: Record<string, string | undefined> = process.env,
): ResendEmailConfiguration & { webhookSecret: string } {
  const configuration = getTransactionalEmailConfiguration(env);
  if (configuration.provider !== "resend" || !configuration.webhookSecret) {
    throw new TransactionalEmailError("EMAIL_PROVIDER_MISCONFIGURED");
  }
  return { ...configuration, webhookSecret: configuration.webhookSecret };
}

export function describeTransactionalEmailConfiguration(
  env: Record<string, string | undefined> = process.env,
) {
  try {
    const configuration = getTransactionalEmailConfiguration(env);
    if (configuration.provider === "disabled") {
      return { provider: "disabled" as const, valid: true, webhookConfigured: false };
    }
    return {
      provider: "resend" as const,
      valid: true,
      webhookConfigured: Boolean(configuration.webhookSecret),
    };
  } catch {
    return { provider: "invalid" as const, valid: false, webhookConfigured: false };
  }
}

export function describeTransactionalEmailOperationalReadiness(
  env: Record<string, string | undefined> = process.env,
) {
  const providerValue = (env.EMAIL_PROVIDER ?? "disabled").trim().toLowerCase();
  const senderValue = env.EMAIL_FROM?.trim() ?? "";
  const replyToValue = env.EMAIL_REPLY_TO?.trim() ?? "";
  const provider =
    providerValue === "resend" ? "resend" : providerValue === "disabled" ? "disabled" : "invalid";
  const apiKeyConfigured = Boolean(env.RESEND_API_KEY?.trim());
  const senderConfigured = mailboxPattern.test(senderValue);
  const replyToConfigured = !replyToValue || emailPattern.test(replyToValue);
  const webhookConfigured = Boolean(env.RESEND_WEBHOOK_SECRET?.trim());
  const recipientHashConfigured = (env.EMAIL_RECIPIENT_HASH_KEY?.length ?? 0) >= 32;
  const externalEffectsMode = (env.EXTERNAL_EFFECTS_MODE ?? "DISABLED").trim().toUpperCase();
  const externalEffectsEnabled = externalEffectsMode === "SANDBOX";
  const valid =
    provider === "disabled" ||
    (provider === "resend" &&
      apiKeyConfigured &&
      senderConfigured &&
      replyToConfigured &&
      recipientHashConfigured);
  const readyToSend = provider === "resend" && valid && externalEffectsEnabled;
  const readyForWebhook = provider === "resend" && valid && webhookConfigured;

  return {
    provider,
    valid,
    readyToSend,
    readyForWebhook,
    externalEffectsMode,
    checks: {
      apiKeyConfigured,
      senderConfigured,
      replyToConfigured,
      webhookConfigured,
      recipientHashConfigured,
      externalEffectsEnabled,
    },
  } as const;
}
