import type { PrismaClient } from "../generated/prisma/client";
import { getPrismaClient } from "../lib/db/client";
import { getExternalEffectsMode,getRuntimeEnvironment,validateRuntimeConfiguration } from "../lib/runtime/config";
export async function verifyStaging(prisma:PrismaClient,env:Record<string,string|undefined>=process.env){
  if(getRuntimeEnvironment(env)!=="staging")throw new Error("STAGING_ONLY");
  const config=validateRuntimeConfiguration(env),cutoff=new Date(Date.now()-600_000);
  const [migrations,owners,tenants,pendingMessages,expiredMessageLeases,expiredWebhookLeases]=await Promise.all([
    prisma.$queryRawUnsafe<Array<{count:number}>>('SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'),
    prisma.platformOperator.count({where:{role:"PLATFORM_OWNER",status:"ACTIVE",user:{status:"ACTIVE"}}}),
    prisma.tenant.findMany({select:{slug:true}}),
    prisma.message.count({where:{status:{in:["PENDING","PROCESSING"]}}}),
    prisma.message.count({where:{status:"PROCESSING",processingStartedAt:{lt:cutoff}}}),
    prisma.webhookEvent.count({where:{status:"PROCESSING",processingStartedAt:{lt:cutoff}}}),
  ]);
  const allow=new Set((env.PILOT_TENANT_SLUGS??"").split(",").map(x=>x.trim()).filter(Boolean));
  return {technicalChecksOnly:true,configurationValid:config.valid,migrationsApplied:Number(migrations[0]?.count??0),platformOwners:owners,pilotAllowlistValid:env.PILOT_MODE!=="true"||tenants.every(t=>allow.has(t.slug)),externalEffectsMode:getExternalEffectsMode(env),asaasSandbox:(env.ASAAS_ENVIRONMENT??"sandbox").toLowerCase()==="sandbox",pendingMessages,expiredLeases:expiredMessageLeases+expiredWebhookLeases};
}
export async function main(){const prisma=getPrismaClient();try{const result=await verifyStaging(prisma);console.info(JSON.stringify(result));if(!result.configurationValid||result.platformOwners<1||!result.pilotAllowlistValid||!result.asaasSandbox)process.exitCode=1}finally{await prisma.$disconnect()}}
if(import.meta.url===`file://${process.argv[1]}`)main().catch(()=>{console.error("Verificação técnica de staging falhou.");process.exitCode=1});
