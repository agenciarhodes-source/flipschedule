import type { BillingProviderAdapter } from "./provider-contract";
import { BillingConfigurationError } from "./provider-contract";
export class BillingProviderRegistry {
  private readonly adapters = new Map<string,BillingProviderAdapter>();
  constructor(adapters:readonly BillingProviderAdapter[]=[]){for(const adapter of adapters){if(this.adapters.has(adapter.provider))throw new Error("DUPLICATE_BILLING_ADAPTER");this.adapters.set(adapter.provider,adapter)}}
  find(provider:"ASAAS"){return this.adapters.get(provider)??null}
  require(provider:"ASAAS"){const adapter=this.find(provider);if(!adapter)throw new BillingConfigurationError();return adapter}
}
