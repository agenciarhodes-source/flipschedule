import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("platform transactional email operations", () => {
  it("reports sanitized readiness without exposing secret values", async () => {
    const { describeTransactionalEmailOperationalReadiness } = await import(
      "@/lib/email/config"
    );
    const readiness = describeTransactionalEmailOperationalReadiness({
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_abcdefghijklmnopqrstuvwxyz123456",
      EMAIL_FROM: "FlipSchedule <noreply@example.test>",
      EMAIL_REPLY_TO: "support@example.test",
      RESEND_WEBHOOK_SECRET: "whsec_abcdefghijklmnopqrstuvwxyz",
      EMAIL_RECIPIENT_HASH_KEY: "0123456789abcdefghijklmnopqrstuvwxyz",
      EXTERNAL_EFFECTS_MODE: "SANDBOX",
    });

    expect(readiness).toMatchObject({
      provider: "resend",
      valid: true,
      readyToSend: true,
      readyForWebhook: true,
      externalEffectsMode: "SANDBOX",
    });
    const serialized = JSON.stringify(readiness);
    expect(serialized).not.toContain("re_abcdefghijklmnopqrstuvwxyz123456");
    expect(serialized).not.toContain("whsec_abcdefghijklmnopqrstuvwxyz");
    expect(serialized).not.toContain("noreply@example.test");
    expect(serialized).not.toContain("0123456789abcdefghijklmnopqrstuvwxyz");
  });

  it("keeps disabled environments valid but not ready to send", async () => {
    const { describeTransactionalEmailOperationalReadiness } = await import(
      "@/lib/email/config"
    );
    expect(
      describeTransactionalEmailOperationalReadiness({
        EMAIL_PROVIDER: "disabled",
        EXTERNAL_EFFECTS_MODE: "DISABLED",
      }),
    ).toMatchObject({
      provider: "disabled",
      valid: true,
      readyToSend: false,
      readyForWebhook: false,
    });
  });

  it("normalizes delivery directory filters", async () => {
    const { emailDeliveryDirectoryQuerySchema } = await import(
      "@/domains/infrastructure/platform/email-operations"
    );
    expect(
      emailDeliveryDirectoryQuerySchema.parse({
        page: "2",
        q: "  provider_rejected  ",
        status: "FAILED",
        kind: "PASSWORD_RESET",
      }),
    ).toEqual({
      page: 2,
      q: "provider_rejected",
      status: "FAILED",
      kind: "PASSWORD_RESET",
    });
    expect(
      emailDeliveryDirectoryQuerySchema.parse({
        page: "invalid",
        status: "UNKNOWN",
        kind: "UNKNOWN",
      }),
    ).toEqual({ page: 1, q: "", status: "ALL", kind: "ALL" });
  });

  it("renders a functional console without email bodies or provider identifiers", () => {
    const page = readFileSync("app/(platform-admin)/admin/email/page.tsx", "utf8");
    const operations = readFileSync(
      "domains/infrastructure/platform/email-operations.ts",
      "utf8",
    );

    expect(page).toContain("Operação de e-mail");
    expect(page).toContain("Prontidão do provider");
    expect(page).toContain("Suppressions ativas");
    expect(page).toContain("liftEmailSuppressionAction");
    expect(page).not.toContain("JSON.stringify");
    expect(operations).not.toContain("providerMessageId: true");
    expect(operations).not.toContain("idempotencyKey: true");
    expect(operations).not.toContain("recipientEmail");
    expect(operations).not.toContain("html: true");
    expect(operations).not.toContain("text: true");
  });

  it("requires explicit confirmation and audits suppression release", () => {
    const operations = readFileSync(
      "domains/infrastructure/platform/email-operations.ts",
      "utf8",
    );
    const actions = readFileSync(
      "app/(platform-admin)/admin/email/actions.ts",
      "utf8",
    );

    expect(operations).toContain('confirmation: z.literal("LIBERAR EMAIL")');
    expect(operations).toContain("SUPPRESSION_ALREADY_LIFTED");
    expect(operations).toContain("platform.email.suppression_lifted");
    expect(operations).toContain('reasonCode: "OPERATOR_CONFIRMED"');
    expect(operations).not.toContain("reason: data.reason");
    expect(actions.startsWith('"use server"')).toBe(true);
    expect(actions).toContain('revalidatePath("/admin/audit")');
  });

  it("adds dedicated email permissions to platform RBAC", () => {
    const rbac = readFileSync("domains/application/platform/rbac.ts", "utf8");
    expect(rbac).toContain('"platform.email.read"');
    expect(rbac).toContain('"platform.email.manage"');
    expect(rbac).toContain("PLATFORM_ADMIN");
    expect(rbac).toContain("BILLING");
  });
});
