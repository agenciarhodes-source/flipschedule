import type { PrismaClient } from "../generated/prisma/client";
import { getPrismaClient } from "../lib/db/client";
import { resolveExternalStagingIdentity } from "../lib/runtime/external-staging";
import { seedSyntheticStaging } from "./seed-staging";

export function assertExternalPilotSeed(env:Record<string,string|undefined>=process.env){const identity=resolveExternalStagingIdentity(env);if(env.SEED_CONFIRMATION!=="SEED_SYNTHETIC_EXTERNAL_STAGING")throw new Error("SEED_CONFIRMATION_REQUIRED");if(!identity.pilotMode||identity.pilotDataMode!=="SYNTHETIC_ONLY"||identity.externalEffectsMode!=="DISABLED")throw new Error("SYNTHETIC_PILOT_CONTRACT_REQUIRED");const slug=env.PILOT_TENANT_SLUG?.trim();if(!slug||!(env.PILOT_TENANT_SLUGS??"").split(",").map(x=>x.trim()).includes(slug))throw new Error("PILOT_TENANT_DENIED");return slug;}
export async function seedExternalStagingPilot(prisma:PrismaClient,env:Record<string,string|undefined>=process.env){return seedSyntheticStaging(prisma,assertExternalPilotSeed(env));}
async function main(){const prisma=getPrismaClient();try{console.info(JSON.stringify(await seedExternalStagingPilot(prisma)))}finally{await prisma.$disconnect()}}
if(import.meta.url===`file://${process.argv[1]}`)main().catch((error:unknown)=>{console.error(error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:"EXTERNAL_STAGING_SEED_FAILED");process.exitCode=1});
