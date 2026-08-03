import {describe,expect,it} from "vitest";
import {canTransitionIntegrationStatus,canTransitionMessageStatus,credentialReferenceSchema,createCorrelationId,isDeadLetter,nonSecretConfigurationSchema,payloadHash,ProviderRegistry,retryAt,UnsupportedProviderError} from "@/domains/application/integrations";
import {createFakeAdapter} from "./helpers/fake-provider-adapter";

describe("secure integration foundation",()=>{
 it("registry is explicit and deny by default",()=>{const empty=new ProviderRegistry();expect(empty.find("WHATSAPP")).toBeNull();expect(()=>empty.require("WHATSAPP")).toThrow(UnsupportedProviderError);expect(new ProviderRegistry([createFakeAdapter("WHATSAPP")]).find("WHATSAPP")).not.toBeNull()});
 it("rejects embedded secrets and invalid credential aliases",()=>{expect(nonSecretConfigurationSchema.safeParse({phoneNumberId:"public",token:"raw"}).success).toBe(false);expect(credentialReferenceSchema.safeParse("env:WHATSAPP_TEST").success).toBe(true);expect(credentialReferenceSchema.safeParse("raw-token").success).toBe(false)});
 it("uses deterministic bounded backoff",()=>{const clock={now:()=>new Date("2026-08-03T00:00:00Z")};expect(retryAt(1,clock,()=>0.5)?.toISOString()).toBe("2026-08-03T00:00:30.000Z");expect(retryAt(5,clock,()=>0.5)).toBeNull()});
 it("prevents status regressions",()=>{expect(canTransitionMessageStatus("PENDING","PROCESSING")).toBe(true);expect(canTransitionMessageStatus("READ","DELIVERED")).toBe(false);expect(canTransitionIntegrationStatus("PENDING","CONNECTED")).toBe(true);expect(canTransitionIntegrationStatus("REVOKED","CONNECTED")).toBe(false)});
 it("hashes payloads, creates opaque correlations and identifies dead letters",()=>{expect(payloadHash(new TextEncoder().encode("x"))).toHaveLength(64);expect(createCorrelationId()).toMatch(/^[0-9a-f-]{36}$/);expect(isDeadLetter({status:"FAILED",attempts:5,nextAttemptAt:null,lastErrorCode:"FAILED"})).toBe(true)});
});
