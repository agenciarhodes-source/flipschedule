import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("platform operations and audit", () => {
  it("normalizes operations directory filters", async () => {
    const { operationsDirectoryQuerySchema } = await import(
      "@/domains/infrastructure/platform/operations"
    );
    expect(
      operationsDirectoryQuerySchema.parse({
        page: "3",
        q: "  PROVIDER_FAILED  ",
        queue: "WEBHOOKS",
        status: "FAILED",
        provider: "ASAAS",
      }),
    ).toEqual({
      page: 3,
      q: "PROVIDER_FAILED",
      queue: "WEBHOOKS",
      status: "FAILED",
      provider: "ASAAS",
    });
    expect(operationsDirectoryQuerySchema.parse({ page: "x", status: "DONE" })).toEqual({
      page: 1,
      q: "",
      queue: "ALL",
      status: "ALL",
      provider: "ALL",
    });
  });

  it("normalizes audit filters and removes sensitive metadata", async () => {
    const { auditDirectoryQuerySchema, sanitizeAuditMetadata } = await import(
      "@/domains/infrastructure/platform/audit-directory"
    );
    expect(
      auditDirectoryQuerySchema.parse({
        page: "2",
        q: "  platform.operation  ",
        outcome: "SUCCESS",
        action: " message_requeued ",
      }),
    ).toEqual({
      page: 2,
      q: "platform.operation",
      outcome: "SUCCESS",
      action: "message_requeued",
    });
    expect(
      sanitizeAuditMetadata({
        provider: "ASAAS",
        previousAttempts: 5,
        token: "secret-token",
        email: "person@example.test",
        payloadCiphertext: "encrypted",
      }),
    ).toEqual({ provider: "ASAAS", previousAttempts: 5 });
  });

  it("renders functional consoles instead of raw JSON", () => {
    const operationsPage = readFileSync(
      "app/(platform-admin)/admin/operations/page.tsx",
      "utf8",
    );
    const auditPage = readFileSync("app/(platform-admin)/admin/audit/page.tsx", "utf8");

    expect(operationsPage).toContain("Runtime assíncrono");
    expect(operationsPage).toContain("requeuePlatformOperationAction");
    expect(operationsPage).toContain("nenhuma integração");
    expect(operationsPage).not.toContain("JSON.stringify");
    expect(auditPage).toContain("Rastreabilidade administrativa");
    expect(auditPage).toContain("Ações mais frequentes");
    expect(auditPage).not.toContain("JSON.stringify");
  });

  it("requeues only failed records through audited database transitions", () => {
    const operations = readFileSync(
      "domains/infrastructure/platform/operations.ts",
      "utf8",
    );
    const action = readFileSync(
      "app/(platform-admin)/admin/operations/actions.ts",
      "utf8",
    );

    expect(operations).toContain('confirmation: z.literal("REPROCESSAR")');
    expect(operations).toContain('row.status !== "FAILED"');
    expect(operations).toContain('status: "PENDING"');
    expect(operations).toContain('status: "RECEIVED"');
    expect(operations).toContain("platform.operation.message_requeued");
    expect(operations).toContain("platform.operation.webhook_requeued");
    expect(operations).toContain('reasonCode: "OPERATOR_CONFIRMED"');
    expect(operations).not.toContain("reason: data.reason");
    expect(action.startsWith('"use server"')).toBe(true);
    expect(action).toContain('revalidatePath("/admin/audit")');
  });

  it("does not call providers or load protected operation content", () => {
    const operations = readFileSync(
      "domains/infrastructure/platform/operations.ts",
      "utf8",
    );

    expect(operations).not.toContain("sendMessage(");
    expect(operations).not.toContain("parseWebhook(");
    expect(operations).not.toContain("bodyCiphertext: true");
    expect(operations).not.toContain("payloadCiphertext: true");
    expect(operations).not.toContain("externalMessageId: true");
    expect(operations).not.toContain("externalEventId: true");
  });

  it("uses existing least-privilege permissions", () => {
    const rbac = readFileSync("domains/application/platform/rbac.ts", "utf8");
    expect(rbac).toContain('"platform.operations.read"');
    expect(rbac).toContain('"platform.operations.retry"');
    expect(rbac).toContain('"platform.audit.read"');
  });
});
