import type { IntegrationProvider } from "@/generated/prisma/client";
import type { IntegrationProviderAdapter } from "./provider-contract";
import { UnsupportedProviderError } from "./errors";

export class ProviderRegistry {
 private readonly adapters = new Map<IntegrationProvider,IntegrationProviderAdapter>();
 constructor(adapters:readonly IntegrationProviderAdapter[]=[]){for(const adapter of adapters){if(this.adapters.has(adapter.provider))throw new Error("DUPLICATE_PROVIDER_ADAPTER");this.adapters.set(adapter.provider,adapter)}}
 find(provider:IntegrationProvider){return this.adapters.get(provider)??null}
 require(provider:IntegrationProvider){const adapter=this.find(provider);if(!adapter)throw new UnsupportedProviderError();return adapter}
}
/** Production is deliberately deny-by-default until an official provider contract is approved. */
export const createProductionProviderRegistry=()=>new ProviderRegistry();
