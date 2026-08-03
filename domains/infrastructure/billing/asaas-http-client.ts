import "server-only";
import { BillingAuthenticationError,BillingPermanentError,BillingTemporaryError } from "@/domains/application/billing";

export const ASAAS_SANDBOX_BASE_URL="https://api-sandbox.asaas.com/v3";
export const ASAAS_PRODUCTION_BASE_URL="https://api.asaas.com/v3";
export type FetchLike=(input:string|URL,init?:RequestInit)=>Promise<Response>;

export class AsaasHttpClient {
  constructor(private readonly options:{accessToken:string;environment:"sandbox"|"production";fetch?:FetchLike;timeoutMs?:number}){
    if(options.environment==="production")throw new BillingPermanentError("ASAAS_PRODUCTION_DISABLED");
    if(!options.accessToken)throw new BillingAuthenticationError();
  }
  async request<T>(method:"GET"|"POST"|"PUT"|"DELETE",path:string,body:unknown,correlationId:string):Promise<T>{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),this.options.timeoutMs??10_000);
    try{
      const response=await (this.options.fetch??fetch)(`${ASAAS_SANDBOX_BASE_URL}${path}`,{method,headers:{access_token:this.options.accessToken,"Content-Type":"application/json",Accept:"application/json","User-Agent":"FlipSchedule/sandbox", "X-Correlation-Id":correlationId},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});
      if(response.status===401||response.status===403)throw new BillingAuthenticationError();
      if(response.status===408||response.status===429||response.status>=500)throw new BillingTemporaryError();
      if(!response.ok)throw new BillingPermanentError();
      if(response.status===204)return undefined as T;
      return await response.json() as T;
    }catch(error){
      if(error instanceof BillingAuthenticationError||error instanceof BillingTemporaryError||error instanceof BillingPermanentError)throw error;
      throw new BillingTemporaryError();
    }finally{clearTimeout(timeout)}
  }
}

export function validateHostedCheckoutUrl(value:string){
  const url=new URL(value);
  if(url.protocol!=="https:"||!(url.hostname==="asaas.com"||url.hostname.endsWith(".asaas.com")))throw new BillingPermanentError("INVALID_CHECKOUT_URL");
  return url.toString();
}
