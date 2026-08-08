import "server-only";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import { requirePermission } from "@/domains/application/rbac";
import type { BillingPlanSource,BillingProviderAdapter } from "@/domains/application/billing";
import { BillingProviderError } from "@/domains/application/billing";
import { assertExternalEffectAllowed } from "@/lib/runtime/external-effects";

export class BillingCheckoutService {
  constructor(private prisma:PrismaClient,private catalog:BillingPlanSource,private adapter:BillingProviderAdapter,private appOrigin:string){}
  async create(context:ApplicationContext,planCode:string){
    assertExternalEffectAllowed("sandbox");
    requirePermission(context.membershipRole,"billing.checkout");
    const plan=await this.catalog.requireActive(planCode);
    const correlationId=randomUUID(),externalReference=`fs_${randomUUID().replaceAll("-","")}`;
    const checkout=await this.prisma.$transaction(async(tx)=>{
      const membership=await tx.membership.findFirst({where:{id:context.membershipId,tenantId:context.tenantId,status:"ACTIVE"},select:{id:true}});
      if(!membership)throw new Error("ACCESS_DENIED");
      const existing=await tx.subscription.findFirst({where:{tenantId:context.tenantId,status:{in:["PENDING","ACTIVE","PAST_DUE","SUSPENDED"]}},select:{id:true}});
      if(existing)throw new Error("SUBSCRIPTION_ALREADY_EXISTS");
      return tx.billingCheckout.create({data:{tenantId:context.tenantId,provider:"ASAAS",planCode:plan.code,externalReference,status:"CREATED",amountCents:plan.priceCents,cycle:plan.cycle,createdByMembershipId:context.membershipId,correlationId}});
    },{isolationLevel:"Serializable"});
    const base=new URL(this.appOrigin);if(base.protocol!=="https:"&&base.hostname!=="localhost")throw new Error("INVALID_APPLICATION_ORIGIN");
    const path=`/${encodeURIComponent(context.tenantSlug)}/configuracoes/assinatura/checkout`;
    try{
      const hosted=await this.adapter.createRecurringCheckout({externalReference,plan:{displayName:plan.displayName,priceCents:plan.priceCents,cycle:plan.cycle,allowedBillingTypes:plan.allowedBillingTypes},nextDueDate:new Date().toISOString().slice(0,10),callback:{successUrl:new URL(`${path}/sucesso`,base).toString(),cancelUrl:new URL(`${path}/cancelado`,base).toString(),expiredUrl:new URL(`${path}/expirado`,base).toString()},correlationId});
      await this.prisma.billingCheckout.updateMany({where:{id:checkout.id,tenantId:context.tenantId,status:"CREATED"},data:{externalCheckoutId:hosted.id,status:"ACTIVE",...(hosted.expiresAt?{expiresAt:hosted.expiresAt}:{})}});
      await this.audit(context,"billing.checkout.created",checkout.id,correlationId);
      return {billingCheckoutId:checkout.id,hostedCheckoutUrl:hosted.url};
    }catch(error){
      await this.prisma.billingCheckout.updateMany({where:{id:checkout.id,tenantId:context.tenantId},data:{status:"FAILED"}});
      await this.audit(context,"billing.checkout.failed",checkout.id,correlationId);
      if(error instanceof BillingProviderError)throw new Error("CHECKOUT_CREATION_FAILED");
      throw error;
    }
  }
  private audit(context:ApplicationContext,action:string,id:string,correlationId:string){return this.prisma.auditLog.create({data:{tenantId:context.tenantId,actorUserId:context.userId,actorMembershipId:context.membershipId,action,resourceType:"BillingCheckout",resourceId:id,outcome:action.endsWith("failed")?"FAILED":"SUCCESS",correlationId}})}
}

export class BillingEntitlementService {
  constructor(private prisma:PrismaClient){}
  async activatePaid(tenantId:string,subscriptionId:string,startsAt:Date,endsAt:Date|null){
    return this.prisma.$transaction(async(tx)=>{
      const protectedEntitlement=await tx.accessEntitlement.findFirst({where:{tenantId,type:{in:["COURTESY","INTERNAL"]},status:"ACTIVE"},select:{id:true}});
      if(protectedEntitlement)return protectedEntitlement;
      const current=await tx.accessEntitlement.findFirst({where:{tenantId,type:"PAID",status:"ACTIVE"},orderBy:{createdAt:"desc"}});
      if(current)return tx.accessEntitlement.update({where:{id:current.id},data:{startsAt,endsAt,reason:`SaaS subscription ${subscriptionId}`}});
      return tx.accessEntitlement.create({data:{tenantId,type:"PAID",status:"ACTIVE",startsAt,endsAt,reason:`SaaS subscription ${subscriptionId}`}});
    },{isolationLevel:"Serializable"});
  }
  async markPastDue(tenantId:string,subscriptionId:string){return this.prisma.subscription.updateMany({where:{id:subscriptionId,tenantId,status:{in:["PENDING","ACTIVE","PAST_DUE"]}},data:{status:"PAST_DUE",gracePeriodEndsAt:null}})}
}

export class BillingSubscriptionService {
  constructor(private prisma:PrismaClient,private adapter:BillingProviderAdapter){}
  async setCancelAtPeriodEnd(context:ApplicationContext,enabled:boolean,confirmation:string){
    requirePermission(context.membershipRole,"billing.cancel");if(context.membershipRole!=="OWNER"||confirmation!=="CANCELAR ASSINATURA")throw new Error("REAUTHENTICATION_REQUIRED");
    const row=await this.prisma.subscription.findFirst({where:{tenantId:context.tenantId,status:{in:["ACTIVE","PAST_DUE","SUSPENDED"]}},select:{id:true,externalSubscriptionId:true,cancelAtPeriodEnd:true}});if(!row)throw new Error("SUBSCRIPTION_NOT_FOUND");if(row.cancelAtPeriodEnd===enabled)return row;
    if(!row.externalSubscriptionId)throw new Error("RECONCILIATION_REQUIRED");
    await this.adapter.updateSubscription(row.externalSubscriptionId,{cancelAtPeriodEnd:enabled},randomUUID());
    return this.prisma.subscription.update({where:{id:row.id},data:{cancelAtPeriodEnd:enabled,lastSyncedAt:new Date()}});
  }
}
