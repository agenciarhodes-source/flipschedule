import type { PrismaClient } from "../generated/prisma/client";
import { createCliPrismaClient } from "../lib/db/cli-client";
import { resolveExternalStagingIdentity } from "../lib/runtime/external-staging";
import { seedSyntheticStaging } from "./seed-staging";
import { hashPassword } from "better-auth/crypto";

const SYNTHETIC_MARKER="[SINTÉTICO]";

export function assertExternalPilotSeed(env:Record<string,string|undefined>=process.env){
  const identity=resolveExternalStagingIdentity(env);
  if(env.SEED_CONFIRMATION!=="SEED_SYNTHETIC_EXTERNAL_STAGING")throw new Error("SEED_CONFIRMATION_REQUIRED");
  if(!identity.pilotMode||identity.pilotDataMode!=="SYNTHETIC_ONLY"||identity.externalEffectsMode!=="DISABLED")throw new Error("SYNTHETIC_PILOT_CONTRACT_REQUIRED");
  const slug=env.PILOT_TENANT_SLUG?.trim();
  const allowlist=(env.PILOT_TENANT_SLUGS??"").split(",").map(x=>x.trim()).filter(Boolean);
  if(!slug||allowlist.length!==1||allowlist[0]!==slug)throw new Error("PILOT_TENANT_DENIED");
  return slug;
}

export async function seedExternalStagingPilot(prisma:PrismaClient,env:Record<string,string|undefined>=process.env){
  const slug=assertExternalPilotSeed(env),email=env.STAGING_SYNTHETIC_USER_EMAIL?.trim().toLowerCase(),password=env.STAGING_SYNTHETIC_USER_PASSWORD;
  if(!email?.endsWith("@example.test")||!password||password.length<16)throw new Error("STAGING_SYNTHETIC_CREDENTIALS_REQUIRED");

  const tenant=await prisma.tenant.upsert({
    where:{slug},
    create:{slug,name:`${SYNTHETIC_MARKER} Clínica piloto de homologação`,timezone:"America/Sao_Paulo",locale:"pt-BR"},
    update:{name:`${SYNTHETIC_MARKER} Clínica piloto de homologação`,status:"ACTIVE"},
    select:{id:true},
  });
  const seeded=await seedSyntheticStaging(prisma,slug);
  const passwordHash=await hashPassword(password);
  const user=await prisma.user.upsert({
    where:{emailNormalized:email},
    create:{emailNormalized:email,displayName:`${SYNTHETIC_MARKER} Operador de smoke`,status:"ACTIVE",emailVerified:true,emailVerifiedAt:new Date()},
    update:{displayName:`${SYNTHETIC_MARKER} Operador de smoke`,status:"ACTIVE",emailVerified:true,emailVerifiedAt:new Date()},
    select:{id:true},
  });
  await prisma.membership.upsert({
    where:{tenantId_userId:{tenantId:tenant.id,userId:user.id}},
    create:{tenantId:tenant.id,userId:user.id,role:"OWNER",status:"ACTIVE",acceptedAt:new Date()},
    update:{role:"OWNER",status:"ACTIVE",acceptedAt:new Date()},
  });
  await prisma.authAccount.upsert({
    where:{providerId_accountId:{providerId:"credential",accountId:user.id}},
    create:{providerId:"credential",accountId:user.id,userId:user.id,password:passwordHash},
    update:{userId:user.id,password:passwordHash},
  });
  await prisma.platformOperator.upsert({
    where:{userId:user.id},
    create:{userId:user.id,role:"PLATFORM_OWNER",status:"ACTIVE"},
    update:{role:"PLATFORM_OWNER",status:"ACTIVE"},
  });
  const entitlement=await prisma.accessEntitlement.findFirst({where:{tenantId:tenant.id,type:"INTERNAL",status:"ACTIVE",reason:`${SYNTHETIC_MARKER} acesso técnico de staging`},select:{id:true}});
  if(!entitlement)await prisma.accessEntitlement.create({data:{tenantId:tenant.id,type:"INTERNAL",status:"ACTIVE",startsAt:new Date(),reason:`${SYNTHETIC_MARKER} acesso técnico de staging`,grantedByUserId:user.id}});

  return {...seeded,datasetProfile:"EXTERNAL_STAGING_PILOT",tenantEnsured:true,platformOwnerEnsured:true,syntheticSmokeAccountEnsured:true};
}

async function main(){const prisma=createCliPrismaClient();try{console.info(JSON.stringify(await seedExternalStagingPilot(prisma)))}finally{await prisma.$disconnect()}}
if(import.meta.url===`file://${process.argv[1]}`)main().catch((error:unknown)=>{console.error(error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:"EXTERNAL_STAGING_SEED_FAILED");process.exitCode=1});
