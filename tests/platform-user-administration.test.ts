import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("platform user administration", () => {
  it("normalizes directory filters and keeps pagination bounded", async () => {
    const {
      platformOperatorDirectoryQuerySchema,
      platformUserDirectoryQuerySchema,
    } = await import(
      "@/domains/infrastructure/platform/administration-directory-reader"
    );

    expect(
      platformUserDirectoryQuerySchema.parse({
        page: "2",
        q: "  Clínica Central  ",
        status: "SUSPENDED",
      }),
    ).toEqual({ page: 2, q: "Clínica Central", status: "SUSPENDED" });
    expect(
      platformUserDirectoryQuerySchema.parse({
        page: "invalid",
        status: "UNKNOWN",
      }),
    ).toEqual({ page: 1, q: "", status: "ALL" });
    expect(
      platformOperatorDirectoryQuerySchema.parse({
        page: "3",
        role: "SUPPORT",
        status: "ACTIVE",
      }),
    ).toEqual({ page: 3, q: "", role: "SUPPORT", status: "ACTIVE" });
  });

  it("exposes functional, sanitized user and operator screens", () => {
    const usersPage = readFileSync(
      "app/(platform-admin)/admin/users/page.tsx",
      "utf8",
    );
    const operatorsPage = readFileSync(
      "app/(platform-admin)/admin/operators/page.tsx",
      "utf8",
    );
    const reader = readFileSync(
      "domains/infrastructure/platform/administration-directory-reader.ts",
      "utf8",
    );

    expect(usersPage).toContain("changePlatformUserStatusAction");
    expect(usersPage).toContain("revokePlatformUserSessionsAction");
    expect(usersPage).toContain("Primeiro acesso pendente");
    expect(usersPage).not.toContain("JSON.stringify");
    expect(operatorsPage).toContain("changePlatformOperatorAction");
    expect(operatorsPage).toContain("Seu operador");
    expect(operatorsPage).not.toContain("JSON.stringify");
    expect(reader).toContain("maskEmail");
    expect(reader).not.toContain("password:");
    expect(reader).not.toContain("token:");
  });

  it("revokes sessions when an account or operator loses access", () => {
    const service = readFileSync(
      "domains/infrastructure/platform/services.ts",
      "utf8",
    );

    expect(service).toContain("SELF_STATUS_CHANGE_DENIED");
    expect(service).toContain("SELF_OPERATOR_CHANGE_DENIED");
    expect(service).toContain('data.status === "ACTIVE"');
    expect(service).toContain("await tx.authSession.deleteMany");
    expect(service).toContain("LAST_PLATFORM_OWNER_REQUIRED");
    expect(service).toContain('isolationLevel: "Serializable"');
    expect(service).toContain("previousStatus");
    expect(service).toContain("nextStatus");
    expect(service).not.toContain("metadata: { reason: data.reason }");
  });

  it("keeps all mutations server-side and revalidates affected directories", () => {
    const userActions = readFileSync(
      "app/(platform-admin)/admin/users/actions.ts",
      "utf8",
    );
    const operatorActions = readFileSync(
      "app/(platform-admin)/admin/operators/actions.ts",
      "utf8",
    );

    expect(userActions.startsWith('"use server"')).toBe(true);
    expect(userActions).toContain('revalidatePath("/admin/users")');
    expect(userActions).toContain('revalidatePath("/admin/operators")');
    expect(operatorActions.startsWith('"use server"')).toBe(true);
    expect(operatorActions).toContain("currentRole");
    expect(operatorActions).toContain("currentStatus");
  });
});
