import { getPrismaClient } from "../lib/db/client";
import { createProductionProviderRegistry } from "../domains/infrastructure/integrations/production-registry";
import { EnvironmentCredentialStore } from "../domains/infrastructure/integrations/credential-store";
import { OutboundMessageWorker } from "../domains/infrastructure/integrations/async-runtime";
import { assertSafeWorkerEnvironment } from "../domains/infrastructure/integrations/runtime-guard";
export async function main(){assertSafeWorkerEnvironment();return new OutboundMessageWorker(getPrismaClient(),createProductionProviderRegistry(),new EnvironmentCredentialStore()).run(20)}
if(import.meta.url===`file://${process.argv[1]}`)main().then(x=>console.info(JSON.stringify(x))).catch(()=>{console.error("Worker de mensagens falhou.");process.exitCode=1})
