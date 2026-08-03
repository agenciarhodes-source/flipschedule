import type { BillingProviderAdapter,HostedCheckout,ProviderPayment,ProviderSubscription,RecurringCheckoutRequest } from "@/domains/application/billing";
export class FakeBillingAdapter implements BillingProviderAdapter {
  readonly provider="ASAAS" as const;
  constructor(){if(process.env.NODE_ENV==="production")throw new Error("FAKE_BILLING_ADAPTER_DISABLED")}
  checkouts:HostedCheckout[]=[]; subscriptions=new Map<string,ProviderSubscription>(); payments=new Map<string,ProviderPayment>();
  async createRecurringCheckout(request:RecurringCheckoutRequest){const result={id:`checkout-${this.checkouts.length+1}`,url:"https://sandbox.asaas.com/checkout/test",status:"ACTIVE"};this.checkouts.push(result);void request;return result}
  async retrieveCheckout(id:string){const result=this.checkouts.find(x=>x.id===id);if(!result)throw new Error("NOT_FOUND");return result}
  async retrieveSubscription(id:string){const result=this.subscriptions.get(id);if(!result)throw new Error("NOT_FOUND");return result}
  async updateSubscription(id:string,input:Readonly<Record<string,unknown>>){const current=await this.retrieveSubscription(id);const result={...current,...input} as ProviderSubscription;this.subscriptions.set(id,result);return result}
  async cancelSubscription(id:string){const current=await this.retrieveSubscription(id);this.subscriptions.set(id,{...current,status:"INACTIVE"})}
  async listSubscriptionPayments(id:string){return [...this.payments.values()].filter(x=>x.subscriptionId===id)}
  async retrievePayment(id:string){const result=this.payments.get(id);if(!result)throw new Error("NOT_FOUND");return result}
  async reconcileSubscription(id:string){return {subscription:await this.retrieveSubscription(id),payments:await this.listSubscriptionPayments(id)}}
}
