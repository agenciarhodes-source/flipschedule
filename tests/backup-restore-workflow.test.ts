import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const workflow=readFileSync(".github/workflows/backup-restore-rehearsal.yml","utf8");
describe("backup restore workflow structure",()=>{
  it("uses immutable disposable PostgreSQL 17 and fixed databases",()=>{expect(workflow).toContain("ubuntu-24.04");expect(workflow).toContain("postgres:17-alpine");expect(workflow).toContain("ref: \"${{ github.sha }}\"");expect(workflow).toContain("persist-credentials: false");expect(workflow).toContain("flipschedule_backup_source");expect(workflow).toContain("flipschedule_backup_restore");});
  it("pins actions, disables effects and never uploads dump",()=>{expect(workflow).toMatch(/actions\/checkout@[a-f0-9]{40}/);expect(workflow).toMatch(/actions\/setup-node@[a-f0-9]{40}/);expect(workflow).toContain("EXTERNAL_EFFECTS_MODE: DISABLED");expect(workflow).not.toMatch(/environment:\s+(staging|production)/);expect(workflow).not.toContain("actions/upload-artifact");expect(workflow).not.toContain("secrets.");});
  it("publishes only after quality gates and cleanup",()=>{const report=workflow.indexOf("ops:report-backup-restore"), build=workflow.indexOf("pnpm build"), cleanup=workflow.indexOf("Confirm dump cleanup and remove disposable databases");expect(report).toBeGreaterThan(build);expect(report).toBeGreaterThan(cleanup);});
  it("uses safe subprocess implementation",()=>{const process=readFileSync("domains/backup-restore/process.ts","utf8");expect(process).toContain("shell: false");expect(process).toContain("spawn(command, [...args]");expect(process).not.toContain("exec(");});
});
