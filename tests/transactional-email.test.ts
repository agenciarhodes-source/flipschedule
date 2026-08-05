import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("transactional email", () => {
  it("fica desabilitado por padrão e não exige secrets no build", async () => {
    const { getTransactionalEmailConfiguration } = await import("@/lib/email/config");
    expect(getTransactionalEmailConfiguration({})).toEqual({ provider: "disabled" });
  });

  it("valida a configuração Resend sem expor os valores", async () => {
    const { getTransactionalEmailConfiguration, describeTransactionalEmailConfiguration } = await import("@/lib/email/config");
    const env = {
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: `re_${"x".repeat(40)}`,
      EMAIL_FROM: "FlipSchedule <no-reply@example.test>",
      EMAIL_REPLY_TO: "support@example.test",
      RESEND_WEBHOOK_SECRET: `whsec_${"y".repeat(40)}`,
      EMAIL_RECIPIENT_HASH_KEY: "h".repeat(40),
    };
    expect(getTransactionalEmailConfiguration(env)).toMatchObject({ provider: "resend", from: env.EMAIL_FROM });
    expect(describeTransactionalEmailConfiguration(env)).toEqual({
      provider: "resend",
      valid: true,
      webhookConfigured: true,
    });
  });

  it("gera fingerprint HMAC sem persistir o endereço", async () => {
    const { fingerprintEmailAddress } = await import("@/lib/email/fingerprint");
    const fingerprint = fingerprintEmailAddress(" OWNER@EXAMPLE.TEST ", "k".repeat(40));
    expect(fingerprint).toHaveLength(64);
    expect(fingerprint).not.toContain("owner@example.test");
    expect(fingerprint).toBe(fingerprintEmailAddress("owner@example.test", "k".repeat(40)));
  });

  it("renderiza template local com HTML e texto sem recursos externos", async () => {
    const { renderPasswordResetEmail } = await import("@/lib/email/templates/password-reset");
    const rendered = renderPasswordResetEmail({
      resetUrl: "https://app.example.test/reset-password?token=opaque-token",
      expiresAt: new Date("2026-08-05T12:00:00.000Z"),
    });
    expect(rendered.subject).toContain("FlipSchedule");
    expect(rendered.html).toContain("Redefinir senha");
    expect(rendered.text).toContain("opaque-token");
    expect(rendered.html).not.toMatch(/<script|<img|https:\/\/fonts\./i);
  });

  it("envia pelo endpoint Resend com idempotência e fetch injetado", async () => {
    const fetchImplementation = vi.fn(async () => new Response(JSON.stringify({ id: "email_123" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const { ResendTransactionalEmailProvider } = await import("@/lib/email/providers/resend");
    const provider = new ResendTransactionalEmailProvider({
      provider: "resend",
      apiKey: `re_${"x".repeat(40)}`,
      from: "FlipSchedule <no-reply@example.test>",
      replyTo: "support@example.test",
      recipientHashKey: "h".repeat(40),
    }, { APP_ENV: "test", EXTERNAL_EFFECTS_MODE: "SANDBOX" }, fetchImplementation);

    await expect(provider.send({
      kind: "PASSWORD_RESET",
      recipientEmail: "owner@example.test",
      subject: "Assunto",
      html: "<p>Mensagem</p>",
      text: "Mensagem",
      idempotencyKey: "password-reset/prt-1",
      replyTo: "support@example.test",
    })).resolves.toEqual({ provider: "resend", providerMessageId: "email_123" });

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const [, request] = fetchImplementation.mock.calls[0];
    expect(request?.headers).toMatchObject({ "idempotency-key": "password-reset/prt-1" });
    expect(String(request?.body)).toContain("owner@example.test");
  });

  it("bloqueia efeitos externos quando o modo está desabilitado", async () => {
    const fetchImplementation = vi.fn();
    const { ResendTransactionalEmailProvider } = await import("@/lib/email/providers/resend");
    const provider = new ResendTransactionalEmailProvider({
      provider: "resend",
      apiKey: `re_${"x".repeat(40)}`,
      from: "no-reply@example.test",
      recipientHashKey: "h".repeat(40),
    }, { APP_ENV: "test", EXTERNAL_EFFECTS_MODE: "DISABLED" }, fetchImplementation);

    await expect(provider.send({
      kind: "PASSWORD_RESET",
      recipientEmail: "owner@example.test",
      subject: "Assunto",
      html: "<p>Mensagem</p>",
      text: "Mensagem",
      idempotencyKey: "password-reset/prt-1",
    })).rejects.toMatchObject({ code: "EMAIL_EXTERNAL_EFFECTS_DISABLED" });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("mapeia eventos e rejeita regressão fora de ordem", async () => {
    const { mapResendEventType, shouldApplyResendTransition } = await import("@/lib/email/resend-webhook");
    expect(mapResendEventType("email.delivered")).toMatchObject({ status: "DELIVERED" });
    expect(mapResendEventType("email.complained")).toMatchObject({ status: "COMPLAINED", suppressionReason: "COMPLAINED" });
    expect(mapResendEventType("email.unknown")).toBeNull();
    expect(shouldApplyResendTransition({
      currentStatus: "DELIVERED",
      currentEventAt: new Date("2026-08-05T12:00:00.000Z"),
      nextStatus: "SENT",
      nextEventAt: new Date("2026-08-05T11:59:00.000Z"),
    })).toBe(false);
  });

  it("mantém o schema sem destinatário, conteúdo ou token bruto", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).toContain("model TransactionalEmailDelivery");
    expect(schema).toContain("recipientFingerprint");
    expect(schema).not.toMatch(/model TransactionalEmailDelivery[\s\S]*recipientEmail/);
    expect(schema).not.toMatch(/model TransactionalEmailDelivery[\s\S]*resetUrl/);
  });
});
