import type { PrismaClient } from "../generated/prisma/client";
import { getPrismaClient } from "../lib/db/client";
import { resolveExternalStagingIdentity } from "../lib/runtime/external-staging";
import { validateRuntimeConfiguration } from "../lib/runtime/config";
import { verifyStaging } from "./ops-verify-staging";

export async function verifyExternalStaging(prisma:PrismaClient,env:Record<string,string|undefined>=process.env){
  const identity=resolveExternalStagingIdentity(env),base=await verifyStaging(prisma,env),pilotSlug=env.PILOT_TENANT_SLUG?.trim();
  const blockers=[...(!validateRuntimeConfiguration(env).valid?["RUNTIME_CONFIGURATION_INVALID"]:[]),...(identity.externalEffectsMode!=="DISABLED"?["EXTERNAL_EFFECTS_NOT_DISABLED"]:[]),...(!base.pilotAllowlistValid?["PILOT_ALLOWLIST_INVALID"]:[]),...(base.platformOwners<1?["PLATFORM_OWNER_MISSING"]:[]),...(base.expiredLeases>0?["CRITICAL_EXPIRED_LEASES"]:[])];
  if(!pilotSlug)blockers.push("PILOT_TENANT_REQUIRED");
  const tenant=pilotSlug?await prisma.tenant.findUnique({where:{slug:pilotSlug},select:{id:true,memberships:{where:{role:"OWNER",status:"ACTIVE"},select:{id:true}},patients:{select:{name:true,phoneE164:true,emailNormalized:true}},leads:{select:{name:true,phoneE164:true,emailNormalized:true}}}}):null;
  if(!tenant)blockers.push("PILOT_TENANT_NOT_FOUND");else {if(!tenant.memberships.length)blockers.push("PILOT_OWNER_MISSING");for(const row of [...tenant.patients,...tenant.leads])if(!/sint[eé]tic/i.test(row.name)||row.phoneE164||(row.emailNormalized&&!row.emailNormalized.endsWith("@example.test")))blockers.push("NON_SYNTHETIC_CLINICAL_DATA");}
  return {status:blockers.length?"BLOCKED":"READY_FOR_HUMAN_REVIEW",errorCodes:[...new Set(blockers)],releaseId:identity.releaseId,commitSha:identity.commitSha,migrationsDigest:identity.migrationsDigest,counts:{migrationsApplied:base.migrationsApplied,platformOwners:base.platformOwners,pilotOwners:tenant?.memberships.length??0,patients:tenant?.patients.length??0,leads:tenant?.leads.length??0,pendingMessages:base.pendingMessages,expiredLeases:base.expiredLeases}};
}
async function main(){const prisma=getPrismaClient();try{const result=await verifyExternalStaging(prisma);console.info(JSON.stringify(result));if(result.errorCodes.length)process.exitCode=1}finally{await prisma.$disconnect()}}
if(import.meta.url===`file://${process.argv[1]}`)main().catch((error:unknown)=>{console.error(JSON.stringify({status:"TECHNICAL_FAILURE",errorCodes:[error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:"EXTERNAL_STAGING_VERIFICATION_FAILED"]}));process.exitCode=1});
