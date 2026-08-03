import { getPrismaClient } from "../lib/db/client";
import { createProductionProviderRegistry } from "../domains/infrastructure/integrations/production-registry";
import { WebhookEventClaimer,WebhookEventProcessor,WebhookEventReconciler } from "../domains/infrastructure/integrations/async-runtime";
import { assertSafeWorkerEnvironment } from "../domains/infrastructure/integrations/runtime-guard";
export async function main(){assertSafeWorkerEnvironment();const prisma=getPrismaClient();return new WebhookEventReconciler(new WebhookEventClaimer(prisma),new WebhookEventProcessor(prisma,createProductionProviderRegistry())).run(20)}
if(import.meta.url===`file://${process.argv[1]}`)main().then(x=>console.info(JSON.stringify(x))).catch(()=>{console.error("Worker de webhooks falhou.");process.exitCode=1})
