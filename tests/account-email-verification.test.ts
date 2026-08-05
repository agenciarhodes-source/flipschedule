import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/email/service", () => ({
  sendTransactionalEmail: vi.fn(async () => ({ provider: "resend", providerMessageId: "email_123" })),
}));
vi.mock("@/lib/observability/logger", () => ({ structuredLog: vi.fn() }));

describe("account email verification", () => {
  it("renderiza template local sem recursos externos", async () => {
    const { renderAccountEmailVerification } = await import("@/lib/email/templates/email-verification");
    const rendered = renderAccountEmailVerification({
      verificationUrl: "https://app.example.test/api/auth/verify-email?token=opaque-token&callbackURL=%2Ftenant%2Fconfiguracoes",
      expiresInMinutes: 60,
    });
    expect(rendered.subject).toContain("FlipSchedule");
    expect(rendered.html).toContain("Confirmar e-mail");
    expect(rendered.text).toContain("opaque-token");
    expect(rendered.html).toContain("&amp;callbackURL");
    expect(rendered.html).not.toMatch(/<script|<img|https:\/\/fonts\./i);
  });

  it("usa referência opaca e o tipo EMAIL_VERIFICATION", async () => {
    const { sendTransactionalEmail } = await import("@/lib/email/service");
    const { buildEmailVerificationDeliveryReference, deliverAccountEmailVerification } = await import("@/lib/auth/email-verification/delivery");
    const token = "raw-verification-token";
    const reference = buildEmailVerificationDeliveryReference(token);
    expect(reference).toHaveLength(64);
    expect(reference).not.toContain(token);

    await deliverAccountEmailVerification({
      recipientEmail: "owner@example.test",
      verificationUrl: `https://app.example.test/api/auth/verify-email?token=${token}`,
      token,
    });
    expect(sendTransactionalEmail).toHaveBeenCalledWith(expect.objectContaining({
      kind: "EMAIL_VERIFICATION",
      deliveryReference: reference,
      recipientEmail: "owner@example.test",
    }));
  });

  it("mantém a verificação opcional para login e usa hook suportado", () => {
    const source = readFileSync("lib/auth/server.ts", "utf8");
    expect(source).toContain("emailVerification:");
    expect(source).toContain("requireEmailVerification: false");
    expect(source).toContain("persistEmailVerifiedAt");
    expect(source).not.toContain("afterEmailVerification");
  });

  it("persiste o timestamp somente após a confirmação oficial", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const { persistEmailVerifiedAt } = await import("@/lib/auth/email-verification/state");
    type Input = Parameters<typeof persistEmailVerifiedAt>[0];
    const verifiedAt = new Date("2026-08-05T12:30:00.000Z");
    const database = { user: { updateMany } } as unknown as Input["database"];

    await expect(persistEmailVerifiedAt({
      database,
      user: { id: "user-1", emailVerified: true },
      contextPath: "/verify-email",
      verifiedAt,
    })).resolves.toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        emailVerified: true,
        emailVerifiedAt: null,
      },
      data: { emailVerifiedAt: verifiedAt },
    });
  });

  it("não grava timestamp fora da rota de confirmação ou para usuário não verificado", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const { persistEmailVerifiedAt } = await import("@/lib/auth/email-verification/state");
    type Input = Parameters<typeof persistEmailVerifiedAt>[0];
    const database = { user: { updateMany } } as unknown as Input["database"];

    await expect(persistEmailVerifiedAt({
      database,
      user: { id: "user-1", emailVerified: true },
      contextPath: "/send-verification-email",
    })).resolves.toBe(false);

    await expect(persistEmailVerifiedAt({
      database,
      user: { id: "user-1", emailVerified: false },
      contextPath: "/verify-email",
    })).resolves.toBe(false);

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("expõe somente o estado necessário na interface", () => {
    const source = readFileSync("components/modules/settings/account-email-verification.tsx", "utf8");
    expect(source).toContain("sendVerificationEmail");
    expect(source).not.toContain("token");
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).toMatch(/enum TransactionalEmailKind[\s\S]*EMAIL_VERIFICATION/);
  });

  it("protege o endpoint manual com sessão e e-mail correspondente", () => {
    const source = readFileSync("lib/auth/server.ts", "utf8");
    expect(source).toContain('ctx.path !== "/send-verification-email"');
    expect(source).toContain("getSessionFromCtx(ctx)");
    expect(source).toContain("requestedEmail !== normalizeEmail(session.user.email)");
    expect(source).toContain('new APIError("UNAUTHORIZED"');
    expect(source).toContain('new APIError("FORBIDDEN"');
  });
});
