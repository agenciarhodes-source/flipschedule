import { describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { validateHumanPilotAttestations, HUMAN_ATTESTATION_KEYS } from "@/scripts/validate-human-pilot-attestations";
import { canonicalDatabaseIdentity, validateStagingRestoreIdentity } from "@/scripts/validate-staging-restore-identity";
import { readFileSync } from "node:fs";
describe("assisted staging controls",()=>{
 it("evaluates exactly six attestations and fails closed",()=>{expect(HUMAN_ATTESTATION_KEYS).toHaveLength(6);expect(validateHumanPilotAttestations({CLINIC:"true",LEGAL:"true",TRAINING:"true",SUPPORT:"true",INCIDENT:"true",SYNTHETIC:"false"}).status).toBe("BLOCKED")});
 it("compares canonical postgres identities",()=>{expect(canonicalDatabaseIdentity("postgres://u:p@DB:5432/a%20b")).toEqual({protocol:"postgresql:",hostname:"db",port:"5432",databaseName:"a b"});expect(()=>validateStagingRestoreIdentity({CONFIRMATION:"VERIFY_STAGING_RESTORE",CHANGE_ID:"PR-41",STAGING_SOURCE_DATABASE_URL:"postgres://a@db/x",STAGING_RESTORED_DATABASE_URL:"postgresql://b@DB:5432/x"})).toThrow("RESTORE_DATABASES_MUST_DIFFER");expect(validateStagingRestoreIdentity({CONFIRMATION:"VERIFY_STAGING_RESTORE",CHANGE_ID:"PR-41",STAGING_SOURCE_DATABASE_URL:"postgres://a@db/source",STAGING_RESTORED_DATABASE_URL:"postgres://b@db/restore"}).valid).toBe(true)});
 it("keeps workflow contracts protected",()=>{const validation=readFileSync(".github/workflows/external-staging-validation.yml","utf8"),seed=readFileSync(".github/workflows/external-staging-synthetic-seed.yml","utf8"),human=readFileSync(".github/workflows/human-pilot-readiness.yml","utf8");expect(validation).toContain('BASE_URL: "${{ vars.STAGING_BASE_URL }}"');expect(seed).not.toContain("ops:run-synthetic-pilot");expect(seed).toContain("STAGING_SYNTHETIC_USER_PASSWORD");expect(human).not.toContain("Object.values(process.env)")});
});
