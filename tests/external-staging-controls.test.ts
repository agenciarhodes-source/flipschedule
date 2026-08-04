import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it,vi} from "vitest";vi.mock("server-only",()=>({}));
import {resolveExternalStagingIdentity} from "@/lib/runtime/external-staging";
const env={APP_ENV:"staging",PILOT_MODE:"true",PILOT_DATA_MODE:"SYNTHETIC_ONLY",EXTERNAL_EFFECTS_MODE:"DISABLED",STAGING_BASE_URL:"https://staging.example.test",STAGING_ALLOWED_HOSTNAME:"staging.example.test",PRODUCTION_HOSTNAME:"app.example.test",DATABASE_URL:"postgresql://user:pass@db-staging.example.test/staging",STAGING_DATABASE_HOSTNAME:"db-staging.example.test",STAGING_DATABASE_NAME:"staging",BUILD_SHA:"a".repeat(40),RELEASE_ID:"release-40",MIGRATIONS_DIGEST:"b".repeat(64)};
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");
describe("external staging identity",()=>{
 it("accepts exact safe identity without exposing credentials",()=>{const identity=resolveExternalStagingIdentity(env);expect(identity.applicationHostname).toBe("staging.example.test");expect(JSON.stringify(identity)).not.toContain("user:pass")});
 it.each([{STAGING_BASE_URL:"http://staging.example.test"},{STAGING_BASE_URL:"https://user:pass@staging.example.test"},{STAGING_BASE_URL:"https://staging.example.test/path"},{STAGING_BASE_URL:"https://staging.example.test?x=1"},{STAGING_BASE_URL:"https://staging.example.test#x"},{STAGING_BASE_URL:"https://staging.example.test.evil"},{STAGING_BASE_URL:"https://app.example.test"},{STAGING_DATABASE_HOSTNAME:"other.example.test"},{STAGING_DATABASE_NAME:"other"}])("rejects unsafe identity %#",override=>expect(()=>resolveExternalStagingIdentity({...env,...override})).toThrow());
});
describe("protected external staging workflows",()=>{
 it("propagates pilot allowlist failures",()=>expect(read("scripts/ops-verify-external-staging.ts")).toContain("!base.pilotAllowlistValid"));
 it("preserves the public staging smoke marker",()=>expect(read("components/layout/staging-banner.tsx")).toContain("AMBIENTE DE HOMOLOGAÇÃO"));
 it("passes BASE_URL to the public smoke",()=>expect(read(".github/workflows/external-staging-validation.yml")).toContain('BASE_URL: "${{ vars.STAGING_BASE_URL }}"'));
 it("provides secure preflight variables and does not run the disposable pilot runner",()=>{const workflow=read(".github/workflows/external-staging-synthetic-seed.yml");for(const key of ["BETTER_AUTH_SECRET","FIELD_ENCRYPTION_KEY","RATE_LIMIT_HASH_KEY","NEXT_PUBLIC_APP_URL","BETTER_AUTH_URL","BETTER_AUTH_TRUSTED_ORIGINS","OPERATIONAL_MODE"])expect(workflow).toContain(key);expect(workflow).not.toContain("ops:run-synthetic-pilot")});
 it("requires release metadata and explicit human attestations",()=>{const workflow=read(".github/workflows/human-pilot-readiness.yml");expect(workflow).toContain("RELEASE_ID");expect(workflow).toContain('const keys=["CLINIC","LEGAL","TRAINING","SUPPORT","INCIDENT","SYNTHETIC"]');expect(workflow).toContain("process.exit(1)")});
 it("requires distinct non-empty restore database identities",()=>{const workflow=read(".github/workflows/staging-restore-validation.yml");expect(workflow).toContain("!source||!restored");expect(workflow).toContain("id(a)===id(b)")});
});
