import "server-only";
import type { BillingProviderAdapter,HostedCheckout,ProviderPayment,ProviderSubscription,RecurringCheckoutRequest } from "@/domains/application/billing";
import { AsaasHttpClient,validateHostedCheckoutUrl } from "./asaas-http-client";
type Json=Record<string,unknown>;
const cents=(value:unknown)=>Math.round(Number(value)*100);
const subscription=(value:Json):ProviderSubscription=>({id:String(value.id),status:String(value.status),...(value.customer?{customerId:String(value.customer)}:{}),...(value.externalReference?{externalReference:String(value.externalReference)}:{}),...(value.cycle?{cycle:String(value.cycle)}:{}),...(value.nextDueDate?{nextDueDate:String(value.nextDueDate)}:{})});
const payment=(value:Json):ProviderPayment=>({id:String(value.id),status:String(value.status),valueCents:cents(value.value),dueDate:String(value.dueDate),...(value.subscription?{subscriptionId:String(value.subscription)}:{}),...(value.paymentDate?{paymentDate:String(value.paymentDate)}:{})});
export class AsaasBillingAdapter implements BillingProviderAdapter {
  readonly provider="ASAAS" as const;
  constructor(private readonly http:AsaasHttpClient){}
  async createRecurringCheckout(request:RecurringCheckoutRequest):Promise<HostedCheckout>{
    const data=await this.http.request<Json>("POST","/checkouts",{chargeTypes:["RECURRENT"],billingTypes:request.plan.allowedBillingTypes,externalReference:request.externalReference,items:[{name:request.plan.displayName,quantity:1,value:request.plan.priceCents/100}],subscription:{cycle:request.plan.cycle,nextDueDate:request.nextDueDate},callback:request.callback},request.correlationId);
    return {id:String(data.id),url:validateHostedCheckoutUrl(String(data.link??data.url)),status:String(data.status??"ACTIVE"),...(data.expirationDate?{expiresAt:new Date(String(data.expirationDate))}:{})};
  }
  async retrieveCheckout(id:string,correlationId:string){const data=await this.http.request<Json>("GET",`/checkouts/${encodeURIComponent(id)}`,undefined,correlationId);return {id:String(data.id),url:validateHostedCheckoutUrl(String(data.link??data.url)),status:String(data.status)}}
  async retrieveSubscription(id:string,correlationId:string){return subscription(await this.http.request<Json>("GET",`/subscriptions/${encodeURIComponent(id)}`,undefined,correlationId))}
  async updateSubscription(id:string,input:Readonly<Record<string,unknown>>,correlationId:string){return subscription(await this.http.request<Json>("PUT",`/subscriptions/${encodeURIComponent(id)}`,input,correlationId))}
  async cancelSubscription(id:string,correlationId:string){await this.http.request<void>("DELETE",`/subscriptions/${encodeURIComponent(id)}`,undefined,correlationId)}
  async listSubscriptionPayments(id:string,correlationId:string){const data=await this.http.request<{data:Json[]}>("GET",`/subscriptions/${encodeURIComponent(id)}/payments`,undefined,correlationId);return data.data.map(payment)}
  async retrievePayment(id:string,correlationId:string){return payment(await this.http.request<Json>("GET",`/payments/${encodeURIComponent(id)}`,undefined,correlationId))}
  async reconcileSubscription(id:string,correlationId:string){const [result,payments]=await Promise.all([this.retrieveSubscription(id,correlationId),this.listSubscriptionPayments(id,correlationId)]);return {subscription:result,payments}}
}
