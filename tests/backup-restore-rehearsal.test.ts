import { chmodSync, symlinkSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BACKUP_FILE_NAME, RESTORE_DATABASE, SOURCE_DATABASE, assertChecksum, assertMatchingFingerprints, assertRehearsalEnvironment, assertSafeDumpPath, assertSanitized, inspectDump } from "../domains/backup-restore/rehearsal";
import { createBackupRestoreReport } from "../scripts/ops-backup-restore-report";
import { runPostgresCommand } from "../domains/backup-restore/process";

const base = { APP_ENV:"staging", EXTERNAL_EFFECTS_MODE:"DISABLED", BACKUP_RESTORE_CONFIRMATION:"REHEARSE_DISPOSABLE_BACKUP_RESTORE", BACKUP_RESTORE_DATABASE_ID:"DISPOSABLE_LOCAL_POSTGRES", SOURCE_DATABASE_URL:`postgresql://user:pass@127.0.0.1:5432/${SOURCE_DATABASE}`, RESTORE_DATABASE_URL:`postgresql://user:pass@127.0.0.1:5432/${RESTORE_DATABASE}` };
describe("disposable backup/restore fail-closed contract",()=>{
  it.each([
    [{...base,RESTORE_DATABASE_URL:base.SOURCE_DATABASE_URL},"SOURCE_RESTORE_MUST_DIFFER"],
    [{...base,SOURCE_DATABASE_URL:`postgresql://u:p@example.com/${SOURCE_DATABASE}`},"DATABASE_HOST_DENIED"],
    [{...base,SOURCE_DATABASE_URL:`postgresql://u:p@ep-neon.tech/${SOURCE_DATABASE}`},"DATABASE_HOST_DENIED"],
    [{...base,SOURCE_DATABASE_URL:`postgresql://u:p@production.internal/${SOURCE_DATABASE}`},"DATABASE_HOST_DENIED"],
    [{...base,BACKUP_RESTORE_CONFIRMATION:"wrong"},"REHEARSAL_CONFIRMATION_REQUIRED"],
    [{...base,BACKUP_RESTORE_DATABASE_ID:undefined},"REHEARSAL_DATABASE_ID_REQUIRED"],
    [{...base,SOURCE_DATABASE_URL:`mysql://u:p@localhost/${SOURCE_DATABASE}`},"DATABASE_PROTOCOL_DENIED"],
    [{...base,SOURCE_DATABASE_URL:"postgresql://u:p@localhost/arbitrary"},"DATABASE_NAME_DENIED"],
    [{...base,EXTERNAL_EFFECTS_MODE:"SANDBOX"},"EXTERNAL_EFFECTS_DENIED"],
  ] as const)("rejects unsafe environment %#",(env,code)=>expect(()=>assertRehearsalEnvironment(env)).toThrow(code));
  it("rejects traversal, outside paths and symlinks",()=>{ const root=mkdtempSync(join(tmpdir(),"guard-")); const outside=mkdtempSync(join(tmpdir(),"outside-")); expect(()=>assertSafeDumpPath(root,join(root,"..",BACKUP_FILE_NAME))).toThrow("DUMP_PATH_DENIED"); expect(()=>assertSafeDumpPath(root,join(outside,BACKUP_FILE_NAME))).toThrow("DUMP_PATH_DENIED"); const target=join(root,"target"); writeFileSync(target,"x"); symlinkSync(target,join(root,BACKUP_FILE_NAME)); expect(()=>inspectDump(root,join(root,BACKUP_FILE_NAME))).toThrow("DUMP_SYMLINK_DENIED"); });
  it("rejects absent, empty and permissive dumps",()=>{const root=mkdtempSync(join(tmpdir(),"dump-")), path=join(root,BACKUP_FILE_NAME); expect(()=>inspectDump(root,path)).toThrow(); writeFileSync(path,"");chmodSync(path,0o600);expect(()=>inspectDump(root,path)).toThrow("DUMP_EMPTY");writeFileSync(path,"x");chmodSync(path,0o644);expect(()=>inspectDump(root,path)).toThrow("DUMP_PERMISSIONS_INVALID");});
  it("rejects checksums and divergent fingerprints",()=>{expect(()=>assertChecksum("bad")).toThrow("DUMP_CHECKSUM_INVALID");expect(()=>assertMatchingFingerprints({migrationCount:1},{migrationCount:2})).toThrow("FINGERPRINT_MISMATCH");});
  it("rejects sensitive output",()=>{for(const value of ["postgresql://u:p@localhost/db","password=visible","person@example.test","+5511999999999"])expect(()=>assertSanitized(value)).toThrow("SENSITIVE_OUTPUT_DENIED");});
  it("does not report success before every gate",()=>expect(()=>createBackupRestoreReport({CHECKED_OUT_SHA:"a".repeat(40),BACKUP_RESTORE_GATES_PASSED:"true",BACKUP_RESTORE_PASSED_GATES:"restore,verification"},{})).toThrow("REPORT_GATES_INCOMPLETE"));
  it("rejects unexpected commands, shell metacharacters and incomplete cleanup state",async()=>{const database=assertRehearsalEnvironment(base).source;await expect(runPostgresCommand("sh",[],database)).rejects.toThrow("POSTGRES_COMMAND_DENIED");await expect(runPostgresCommand("pg_dump",["bad\narg"],database)).rejects.toThrow("POSTGRES_COMMAND_DENIED");expect(()=>createBackupRestoreReport({CHECKED_OUT_SHA:"a".repeat(40),BACKUP_RESTORE_GATES_PASSED:"true",BACKUP_RESTORE_PASSED_GATES:"restore,verification,focused-tests,lint,typecheck,build,cleanup"},{restoreCompleted:true,verificationCompleted:true,fingerprintsMatch:true,sourcePreserved:false})).toThrow("REPORT_STATE_INCOMPLETE");});
});
