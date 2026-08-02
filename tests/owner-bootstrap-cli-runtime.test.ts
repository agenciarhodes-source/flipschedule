import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("owner bootstrap CLI boundaries", () => {
  it("imports the core without initializing a database", async () => {
    await expect(import("@/lib/auth/bootstrap-owner-core")).resolves.toBeDefined();
  });

  it("keeps server-only out of the core and CLI dependency graph", async () => {
    const core = await readFile(resolve("lib/auth/bootstrap-owner-core.ts"), "utf8");
    const cli = await readFile(resolve("scripts/bootstrap-owner.ts"), "utf8");

    expect(core).not.toContain('import "server-only"');
    expect(cli).toContain('../lib/auth/bootstrap-owner-core');
    expect(cli).not.toContain('../lib/auth/bootstrap-owner"');
  });

  it("keeps the application wrapper protected by server-only", async () => {
    const wrapper = await readFile(resolve("lib/auth/bootstrap-owner.ts"), "utf8");
    expect(wrapper).toMatch(/^import "server-only";/);
  });

  it("reports only the missing secret name in the workflow preflight", async () => {
    const workflow = await readFile(resolve(".github/workflows/bootstrap-production-owner.yml"), "utf8");
    expect(workflow).toContain("Missing required production bootstrap secret: $secret_name");
    expect(workflow).not.toContain("echo \"${!secret_name}\"");
  });

  it("checks migrations before bootstrap without applying them and uses the direct URL", async () => {
    const workflow = await readFile(resolve(".github/workflows/bootstrap-production-owner.yml"), "utf8");
    const statusPosition = workflow.indexOf("pnpm db:migrate:production:status");
    const bootstrapPosition = workflow.indexOf("pnpm auth:bootstrap-owner");

    expect(statusPosition).toBeGreaterThan(-1);
    expect(bootstrapPosition).toBeGreaterThan(statusPosition);
    expect(workflow).not.toMatch(/pnpm (?:db:)?migrate:(?:dev|deploy|production:deploy)|prisma (?:db push|migrate reset)/);
    expect(workflow).toContain("DIRECT_DATABASE_URL: ${{ secrets.NEON_PRODUCTION_DIRECT_URL }}");
    expect(workflow).toContain("DATABASE_URL: ${{ secrets.NEON_PRODUCTION_DIRECT_URL }}");
  });
});
