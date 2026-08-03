import { assertSafeWorkerEnvironment } from "../domains/infrastructure/integrations/runtime-guard";
/** No production adapter currently declares reconciliation support. */
export async function main(){assertSafeWorkerEnvironment();return {reconciled:0,reason:"NO_SUPPORTED_ADAPTER"}}
if(import.meta.url===`file://${process.argv[1]}`)main().then(x=>console.info(JSON.stringify(x))).catch(()=>{console.error("Reconciliação falhou.");process.exitCode=1})
