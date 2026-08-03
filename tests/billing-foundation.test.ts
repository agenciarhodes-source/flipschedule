import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {BillingPlanCatalog,checkoutEventStatus,paymentEventStatus,resolveTenantAccessState} from "@/domains/application/billing";
import {AsaasHttpClient,ASAAS_SANDBOX_BASE_URL,validateHostedCheckoutUrl} from "@/domains/infrastructure/billing/asaas-http-client";
import {AsaasBillingAdapter} from "@/domains/infrastructure/billing/asaas-billing-adapter";

describe("secure SaaS billing foundation",()=>{
  it("keeps the unapproved commercial catalog empty",()=>expect(new BillingPlanCatalog().listActive()).toEqual([]));
  it("requires integer cents and an active catalog entry",()=>{
    expect(()=>new BillingPlanCatalog([{code:"test",displayName:"Test",priceCents:1.2,cycle:"MONTHLY",active:true,allowedBillingTypes:["PIX"],entitlementPolicy:{type:"PAID",gracePeriodDays:null},limits:{},version:1}])).toThrow("INVALID_PLAN_PRICE");
    expect(()=>new BillingPlanCatalog().requireActive("unknown")).toThrow("PLAN_NOT_AVAILABLE");
  });
  it("uses Asaas sandbox headers without bearer auth",async()=>{
    const fetch=vi.fn(async(_url:string|URL,init?:RequestInit)=>{expect(String(_url)).toBe(`${ASAAS_SANDBOX_BASE_URL}/payments/p_1`);expect(new Headers(init?.headers).get("access_token")).toBe("sandbox-test-key");expect(new Headers(init?.headers).get("authorization")).toBeNull();return new Response(JSON.stringify({id:"p_1",status:"PENDING",value:10,dueDate:"2026-08-04"}),{status:200})});
    await new AsaasHttpClient({accessToken:"sandbox-test-key",environment:"sandbox",fetch}).request("GET","/payments/p_1",undefined,"correlation");expect(fetch).toHaveBeenCalledOnce();
  });
  it("blocks production and rejects arbitrary checkout URLs",()=>{expect(()=>new AsaasHttpClient({accessToken:"x",environment:"production"})).toThrow("ASAAS_PRODUCTION_DISABLED");expect(()=>validateHostedCheckoutUrl("https://evil.example/checkout")).toThrow("INVALID_CHECKOUT_URL");expect(validateHostedCheckoutUrl("https://sandbox.asaas.com/checkout/opaque")).toContain("asaas.com")});
  it("derives recurring checkout fields on the server",async()=>{let body:Record<string,unknown>|null=null;const fetch=vi.fn(async(_url:string|URL,init?:RequestInit)=>{body=JSON.parse(String(init?.body));return new Response(JSON.stringify({id:"c_1",link:"https://sandbox.asaas.com/checkout/opaque",status:"ACTIVE"}),{status:200})});const adapter=new AsaasBillingAdapter(new AsaasHttpClient({accessToken:"test",environment:"sandbox",fetch}));await adapter.createRecurringCheckout({externalReference:"fs_opaque",plan:{displayName:"Test",priceCents:1234,cycle:"MONTHLY",allowedBillingTypes:["PIX"]},nextDueDate:"2026-08-04",callback:{successUrl:"https://app.example/s",cancelUrl:"https://app.example/c",expiredUrl:"https://app.example/e"},correlationId:"id"});expect(body).toMatchObject({chargeTypes:["RECURRENT"],externalReference:"fs_opaque",items:[{value:12.34}],subscription:{cycle:"MONTHLY"}});expect(JSON.stringify(body)).not.toMatch(/cardNumber|creditCard|cvv/)});
  it("maps supported events explicitly",()=>{expect(checkoutEventStatus.CHECKOUT_PAID).toBe("PAID");expect(paymentEventStatus.PAYMENT_OVERDUE).toBe("OVERDUE");expect(paymentEventStatus.PAYMENT_CREDIT_CARD_CAPTURE_REFUSED).toBe("FAILED")});
  it("does not invent grace or override courtesy access",()=>{const now=new Date("2026-08-03T00:00:00Z");expect(resolveTenantAccessState([{type:"COURTESY",status:"ACTIVE",endsAt:null}],{status:"SUSPENDED",gracePeriodEndsAt:null},now)).toBe("COURTESY");expect(resolveTenantAccessState([{type:"PAID",status:"ACTIVE",endsAt:null}],{status:"PAST_DUE",gracePeriodEndsAt:null},now)).toBe("ACTIVE")});
});
