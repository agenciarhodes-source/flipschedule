import {describe,expect,it,vi} from "vitest";vi.mock("server-only",()=>({}));
import {canManagePlatformOperator,ensureLastPlatformOwner,hasPlatformPermission,maskEmail} from "@/domains/application/platform";
import {AsaasWebhookAdapter} from "@/domains/infrastructure/billing/asaas-webhook-adapter";
import {createProductionProviderRegistry} from "@/domains/infrastructure/integrations/production-registry";
import {billingCheckoutStatusLabel,paymentStatusLabel,subscriptionStatusLabel} from "@/domains/application/billing";
const webhook=(event:string,field:string,row:object)=>({provider:"ASAAS" as const,headers:{},rawBody:new TextEncoder().encode(JSON.stringify({event,[field]:row})),receivedAt:new Date(),externalEventId:"evt",integrationExternalAccountId:"account"});
describe("platform administration security",()=>{
 it("keeps tenant roles outside platform RBAC",()=>{expect(hasPlatformPermission("READONLY","platform.tenants.read")).toBe(true);expect(hasPlatformPermission("READONLY","platform.tenants.manage_status")).toBe(false);expect(hasPlatformPermission("SUPPORT","platform.entitlements.manage")).toBe(false);expect(hasPlatformPermission("BILLING","platform.users.manage_status")).toBe(false)});
 it("protects platform owners",()=>{expect(canManagePlatformOperator("PLATFORM_ADMIN","PLATFORM_OWNER")).toBe(false);expect(()=>ensureLastPlatformOwner({targetRole:"PLATFORM_OWNER",targetStatus:"ACTIVE",nextStatus:"REVOKED",activeOwnerCount:1})).toThrow("LAST_PLATFORM_OWNER_REQUIRED")});
 it("masks operator-visible email",()=>expect(maskEmail("person@example.com")).toBe("p***@e***.com"));
 it("builds Asaas registry only when configured",()=>{expect(createProductionProviderRegistry({}).find("ASAAS")).toBeNull();expect(createProductionProviderRegistry({ASAAS_WEBHOOK_TOKEN:"token"}).find("ASAAS")).toBeInstanceOf(AsaasWebhookAdapter)});
 it("parses supported Asaas events and rejects unknown ones",async()=>{const adapter=new AsaasWebhookAdapter("token");await expect(adapter.parseWebhook(webhook("PAYMENT_RECEIVED","payment",{id:"pay",subscription:"sub",status:"RECEIVED",value:10,dueDate:"2026-08-03"}))).resolves.toMatchObject([{type:"BillingPaymentChanged",status:"RECEIVED",amountCents:1000}]);await expect(adapter.parseWebhook(webhook("UNKNOWN","payment",{}))).rejects.toThrow("WEBHOOK_EVENT_UNSUPPORTED")});
 it("renders billing labels in pt-BR",()=>{expect(subscriptionStatusLabel("PAST_DUE")).toBe("Em atraso");expect(paymentStatusLabel("RECEIVED")).toBe("Recebido");expect(billingCheckoutStatusLabel("CANCELLED")).toBe("Cancelado")});
});
