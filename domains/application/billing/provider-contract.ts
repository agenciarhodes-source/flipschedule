import type { BillingCycle, BillingType } from "./catalog";

export interface RecurringCheckoutRequest {
  externalReference: string;
  plan: { displayName: string; priceCents: number; cycle: BillingCycle; allowedBillingTypes: readonly BillingType[] };
  nextDueDate: string;
  callback: { successUrl: string; cancelUrl: string; expiredUrl: string };
  correlationId: string;
}
export interface HostedCheckout { id: string; url: string; status: string; expiresAt?: Date }
export interface ProviderSubscription { id:string; customerId?:string; externalReference?:string; status:string; cycle?:string; nextDueDate?:string }
export interface ProviderPayment { id:string; subscriptionId?:string; status:string; valueCents:number; dueDate:string; paymentDate?:string }
export interface BillingProviderAdapter {
  readonly provider: "ASAAS";
  createRecurringCheckout(request:RecurringCheckoutRequest):Promise<HostedCheckout>;
  retrieveCheckout(id:string,correlationId:string):Promise<HostedCheckout>;
  retrieveSubscription(id:string,correlationId:string):Promise<ProviderSubscription>;
  updateSubscription(id:string,input:Readonly<Record<string,unknown>>,correlationId:string):Promise<ProviderSubscription>;
  cancelSubscription(id:string,correlationId:string):Promise<void>;
  listSubscriptionPayments(id:string,correlationId:string):Promise<readonly ProviderPayment[]>;
  retrievePayment(id:string,correlationId:string):Promise<ProviderPayment>;
  reconcileSubscription(id:string,correlationId:string):Promise<{subscription:ProviderSubscription;payments:readonly ProviderPayment[]}>;
}
export class BillingProviderError extends Error { constructor(readonly code:string,readonly temporary=false){super(code)} }
export class BillingConfigurationError extends BillingProviderError { constructor(){super("BILLING_NOT_CONFIGURED")} }
export class BillingAuthenticationError extends BillingProviderError { constructor(){super("PROVIDER_AUTHENTICATION_FAILED")} }
export class BillingTemporaryError extends BillingProviderError { constructor(code="PROVIDER_UNAVAILABLE"){super(code,true)} }
export class BillingPermanentError extends BillingProviderError { constructor(code="PROVIDER_OPERATION_REJECTED"){super(code)} }
