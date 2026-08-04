import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assertSyntheticPilotSeedEnvironment,
  PILOT_SLUG,
  SYNTHETIC_DATABASE_ID,
  SYNTHETIC_NOW,
} from "@/domains/pilot/synthetic-data";
import {
  runPilotScenarios,
  type PilotScenario,
} from "@/domains/pilot/scenario-runner";
import {
  assertSanitizedReport,
  createSyntheticPilotReport,
} from "@/domains/pilot/rehearsal-report";
import { countMigrationDirectories } from "@/scripts/pilot-migration-count";

const disposableUrl = "postgresql://ephemeral:ephemeral@localhost:5432/synthetic_pilot";
const valid = {
  APP_ENV: "staging",
  SEED_CONFIRMATION: "SEED_SYNTHETIC_PILOT",
  EXTERNAL_EFFECTS_MODE: "DISABLED",
  PILOT_TENANT_SLUGS: PILOT_SLUG,
  SYNTHETIC_PILOT_DATABASE_ID: SYNTHETIC_DATABASE_ID,
  DATABASE_URL: disposableUrl,
  DIRECT_DATABASE_URL: disposableUrl,
};

describe("synthetic pilot protections", () => {
  it("requires staging, confirmation, disabled effects and exact allowlist", () => {
    expect(() => assertSyntheticPilotSeedEnvironment(valid)).not.toThrow();
    for (const env of [
      { ...valid, APP_ENV: "production" },
      { ...valid, SEED_CONFIRMATION: "wrong" },
      { ...valid, EXTERNAL_EFFECTS_MODE: "ENABLED" },
      { ...valid, PILOT_TENANT_SLUGS: "real" },
      { ...valid, SYNTHETIC_PILOT_DATABASE_ID: "" },
    ]) {
      expect(() => assertSyntheticPilotSeedEnvironment(env)).toThrow();
    }
  });

  it("rejects shared or non-loopback databases", () => {
    for (const databaseUrl of [
      "postgresql://ephemeral:ephemeral@staging.internal:5432/synthetic_pilot",
      "postgresql://ephemeral:ephemeral@localhost:5432/shared_staging",
      "postgresql://other:secret@localhost:5432/synthetic_pilot",
      "postgresql://ephemeral:ephemeral@localhost:6432/synthetic_pilot",
    ]) {
      expect(() =>
        assertSyntheticPilotSeedEnvironment({
          ...valid,
          DATABASE_URL: databaseUrl,
          DIRECT_DATABASE_URL: databaseUrl,
        }),
      ).toThrow();
    }
  });

  it("rejects a different direct database", () => {
    expect(() =>
      assertSyntheticPilotSeedEnvironment({
        ...valid,
        DIRECT_DATABASE_URL: "postgresql://ephemeral:ephemeral@127.0.0.1:5432/synthetic_pilot",
      }),
    ).toThrow("SYNTHETIC_PILOT_DATABASE_MISMATCH");
  });

  it("counts only valid migration directories", () => {
    const root = mkdtempSync(join(tmpdir(), "migrations-"));
    mkdirSync(join(root, "20260101_one"));
    writeFileSync(join(root, "migration_lock.toml"), "");
    mkdirSync(join(root, "notes"));
    expect(countMigrationDirectories(root)).toBe(1);
  });

  it("continues noncritical failures and stops on critical failure", async () => {
    const fail: PilotScenario = {
      id: "fail",
      title: "",
      category: "",
      execute: async () => [{ id: "x", passed: false }],
    };
    const pass: PilotScenario = {
      id: "pass",
      title: "",
      category: "",
      execute: async () => [{ id: "x", passed: true }],
    };
    const context = {
      prisma: {} as never,
      now: SYNTHETIC_NOW,
      externalCalls: { count: 0 },
      env: {},
    };
    expect(await runPilotScenarios(context, [fail, pass])).toHaveLength(2);
    expect(await runPilotScenarios(context, [{ ...fail, critical: true }, pass])).toHaveLength(1);
  });

  it("creates a sanitized deterministic report", () => {
    const report = createSyntheticPilotReport({
      checkedOutSha: "a".repeat(40),
      releaseId: "release",
      migrationsDigest: "m",
      lockfileDigest: "l",
      migrationCount: 1,
      startedAt: SYNTHETIC_NOW,
      completedAt: SYNTHETIC_NOW,
      results: [],
      externalCallsAttempted: 0,
    });
    expect(report.technicalRehearsalOnly).toBe(true);
    expect(report.externalCallsAttempted).toBe(0);
    expect(() => assertSanitizedReport(report)).not.toThrow();
    expect(() => assertSanitizedReport({ email: "person@example.test" })).toThrow();
  });
});
