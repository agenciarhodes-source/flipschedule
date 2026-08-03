export const checkoutEventStatus = {CHECKOUT_CREATED:"ACTIVE",CHECKOUT_PAID:"PAID",CHECKOUT_CANCELED:"CANCELLED",CHECKOUT_EXPIRED:"EXPIRED"} as const;
export const paymentEventStatus = {PAYMENT_CREATED:"PENDING",PAYMENT_UPDATED:"PENDING",PAYMENT_CONFIRMED:"CONFIRMED",PAYMENT_RECEIVED:"RECEIVED",PAYMENT_OVERDUE:"OVERDUE",PAYMENT_REFUNDED:"REFUNDED",PAYMENT_CREDIT_CARD_CAPTURE_REFUSED:"FAILED",PAYMENT_DELETED:"CANCELLED",PAYMENT_BANK_SLIP_CANCELLED:"CANCELLED"} as const;
export type TenantAccessState="ACTIVE"|"TRIAL"|"PAST_DUE_GRACE"|"SUSPENDED"|"EXPIRED"|"COURTESY"|"INTERNAL";
export function resolveTenantAccessState(entitlements:readonly {type:"TRIAL"|"PAID"|"COURTESY"|"INTERNAL";status:"ACTIVE"|"EXPIRED"|"REVOKED";endsAt:Date|null}[],subscription:{status:string;gracePeriodEndsAt:Date|null}|null,now=new Date()):TenantAccessState{
  const active=entitlements.filter((item)=>item.status==="ACTIVE"&&(!item.endsAt||item.endsAt>now));
  if(active.some((item)=>item.type==="INTERNAL"))return "INTERNAL";
  if(active.some((item)=>item.type==="COURTESY"))return "COURTESY";
  if(active.some((item)=>item.type==="TRIAL"))return "TRIAL";
  if(subscription?.status==="PAST_DUE")return subscription.gracePeriodEndsAt&&subscription.gracePeriodEndsAt>now?"PAST_DUE_GRACE":"ACTIVE";
  if(subscription?.status==="SUSPENDED")return "SUSPENDED";
  return active.some((item)=>item.type==="PAID")?"ACTIVE":"EXPIRED";
}
