import { randomUUID } from "node:crypto";
import { getPrismaClient } from "../lib/db";
import { AsaasBillingAdapter } from "../domains/infrastructure/billing/asaas-billing-adapter";
import { AsaasHttpClient } from "../domains/infrastructure/billing/asaas-http-client";
import { AsaasBillingReconciliationService } from "../domains/infrastructure/billing/reconciliation-service";
import { EnvironmentCredentialStore } from "../domains/infrastructure/integrations/credential-store";
import { assertSafeWorkerEnvironment } from "../domains/infrastructure/integrations/runtime-guard";
export async function main(limit=20){assertSafeWorkerEnvironment();const prisma=getPrismaClient(),rows=await prisma.subscription.findMany({where:{provider:"ASAAS",externalSubscriptionId:{not:null},status:{in:["PENDING","ACTIVE","PAST_DUE","SUSPENDED"]}},select:{id:true,tenantId:true},take:Math.min(20,Math.max(1,limit)),orderBy:{updatedAt:"asc"}});let reconciled=0;for(const row of rows){const integration=await prisma.integration.findFirst({where:{tenantId:row.tenantId,provider:"ASAAS",status:"CONNECTED"},select:{credentialReference:true}});if(!integration?.credentialReference)continue;const credentials=await new EnvironmentCredentialStore().resolve(integration.credentialReference);const key=credentials?.values.primary;if(!key)continue;const service=new AsaasBillingReconciliationService(prisma,new AsaasBillingAdapter(new AsaasHttpClient({accessToken:key,environment:"sandbox"})));await service.reconcile(row.tenantId,row.id,randomUUID());reconciled++}return {scanned:rows.length,reconciled}}
if(import.meta.url===`file://${process.argv[1]}`)main().then(result=>console.info(JSON.stringify(result))).catch(()=>{console.error("Reconciliação de billing falhou.");process.exitCode=1})
