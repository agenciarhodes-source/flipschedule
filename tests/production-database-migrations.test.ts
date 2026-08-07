import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(__dirname, "..");
const readText = (relativePath: string) => readFileSync(path.join(rootDir, relativePath), "utf8");

describe("Production database migration infrastructure", () => {
  it("creates a dedicated Prisma deploy config that uses DIRECT_DATABASE_URL", () => {
    const config = readText("prisma.deploy.config.ts");

    expect(config).toContain('import "dotenv/config";');
    expect(config).toContain('import { defineConfig, env } from "prisma/config";');
    expect(config).toContain('schema: "prisma"');
    expect(config).toContain('path: "prisma/migrations"');
    expect(config).toContain('url: env("DIRECT_DATABASE_URL")');
    expect(config).not.toContain("shadowDatabaseUrl");
    expect(config).not.toContain('env("DATABASE_URL")');
  });

  it("adds production deploy scripts to package.json", () => {
    const packageJson = readText("package.json");

    expect(packageJson).toContain('"db:migrate:production:deploy": "prisma migrate deploy --config prisma.deploy.config.ts"');
    expect(packageJson).toContain('"db:migrate:production:status": "prisma migrate status --config prisma.deploy.config.ts"');
  });

  it("creates a manual production workflow with safety controls", () => {
    const workflow = readText(".github/workflows/database-migrate-production.yml");

    expect(workflow).toContain("name: Database migration — production");
    expect(workflow).toContain("workflow_dispatch");
    expect(workflow).toContain("DEPLOY");
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("concurrency:");
    expect(workflow).toContain("flipschedule-production-database-migration");
    expect(workflow).toContain("secrets.NEON_PRODUCTION_DIRECT_URL");
    expect(workflow).toContain("DIRECT_DATABASE_URL");
    expect(workflow).toContain("pnpm db:migrate:production:deploy");
    expect(workflow).toContain("pnpm db:migrate:production:status");
    expect(workflow).not.toContain("migrate dev");
    expect(workflow).not.toContain("db push");
    expect(workflow).not.toContain("migrate reset");
    expect(workflow).not.toMatch(/postgres(?:ql)?:\/\//i);
  });

  it("keeps the production deployment docs and example secret in place", () => {
    expect(existsSync(path.join(rootDir, "docs/PRODUCTION_DATABASE_MIGRATIONS.md"))).toBe(true);
    expect(readText(".env.example")).toContain("NEON_PRODUCTION_DIRECT_URL=");
  });
});
