import "server-only";
import { ProviderRegistry } from "@/domains/application/integrations";
import { AsaasWebhookAdapter } from "@/domains/infrastructure/billing/asaas-webhook-adapter";
export function createProductionProviderRegistry(environment:Record<string,string|undefined>=process.env){const token=environment.ASAAS_WEBHOOK_TOKEN?.trim();return new ProviderRegistry(token?[new AsaasWebhookAdapter(token)]:[])}
