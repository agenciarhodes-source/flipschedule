import { getPrismaClient } from "../lib/db/client";
import { assertSyntheticPilotSeedEnvironment, seedSyntheticPilot } from "../domains/pilot/synthetic-data";
export async function main(){assertSyntheticPilotSeedEnvironment();const prisma=getPrismaClient();try{const result=await seedSyntheticPilot(prisma);console.info(JSON.stringify(result))}finally{await prisma.$disconnect()}}
if(import.meta.url===`file://${process.argv[1]}`)main().catch(()=>{console.error("Seed do ensaio técnico sintético recusado ou falhou.");process.exitCode=1});
