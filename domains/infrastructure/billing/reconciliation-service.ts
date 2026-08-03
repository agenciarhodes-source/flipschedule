import "server-only";
import type { PrismaClient,SubscriptionStatus,PaymentStatus } from "@/generated/prisma/client";
import type { BillingProviderAdapter,ProviderPayment } from "@/domains/application/billing";
const subscriptionStatus=(value:string):SubscriptionStatus=>({ACTIVE:"ACTIVE",PENDING:"PENDING",OVERDUE:"PAST_DUE",INACTIVE:"SUSPENDED",EXPIRED:"EXPIRED",DELETED:"CANCELLED"}[value] as SubscriptionStatus|undefined)??"PENDING";
const paymentStatus=(value:string):PaymentStatus=>({PENDING:"PENDING",CONFIRMED:"CONFIRMED",RECEIVED:"RECEIVED",OVERDUE:"OVERDUE",REFUNDED:"REFUNDED",DELETED:"CANCELLED",CANCELLED:"CANCELLED",CREDIT_CARD_CAPTURE_REFUSED:"FAILED"}[value] as PaymentStatus|undefined)??"PENDING";
export class AsaasBillingReconciliationService {
  constructor(private prisma:PrismaClient,private adapter:BillingProviderAdapter){}
  async reconcile(tenantId:string,subscriptionId:string,correlationId:string){
    const local=await this.prisma.subscription.findFirst({where:{id:subscriptionId,tenantId,provider:"ASAAS"},select:{id:true,externalSubscriptionId:true}});if(!local?.externalSubscriptionId)throw new Error("RECONCILIATION_REQUIRED");
    const result=await this.adapter.reconcileSubscription(local.externalSubscriptionId,correlationId),now=new Date();
    await this.prisma.$transaction(async tx=>{await tx.subscription.updateMany({where:{id:local.id,tenantId},data:{providerStatus:result.subscription.status,status:subscriptionStatus(result.subscription.status),...(result.subscription.customerId?{externalCustomerId:result.subscription.customerId}:{}),lastSyncedAt:now}});for(const item of result.payments)await this.upsertPayment(tx as PrismaClient,tenantId,local.id,item,correlationId,now)});
    return {payments:result.payments.length};
  }
  private upsertPayment(prisma:PrismaClient,tenantId:string,subscriptionId:string,item:ProviderPayment,correlationId:string,now:Date){return prisma.payment.upsert({where:{provider_externalPaymentId:{provider:"ASAAS",externalPaymentId:item.id}},create:{tenantId,subscriptionId,provider:"ASAAS",externalPaymentId:item.id,status:paymentStatus(item.status),providerStatus:item.status,amountCents:item.valueCents,dueAt:new Date(`${item.dueDate}T12:00:00Z`),paidAt:item.paymentDate?new Date(`${item.paymentDate}T12:00:00Z`):null,lastSyncedAt:now,correlationId},update:{status:paymentStatus(item.status),providerStatus:item.status,amountCents:item.valueCents,paidAt:item.paymentDate?new Date(`${item.paymentDate}T12:00:00Z`):null,lastSyncedAt:now,correlationId}})}
}
