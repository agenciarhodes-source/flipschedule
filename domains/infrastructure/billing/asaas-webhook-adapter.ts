import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { IntegrationProviderAdapter,ProviderWebhookRequest } from "@/domains/application/integrations";
export class AsaasWebhookAdapter implements IntegrationProviderAdapter {
  readonly provider="ASAAS" as const;
  supportsChannel(){return false}
  async validateConfiguration(){return {valid:true as const,configuration:{environment:"sandbox"}}}
  async healthCheck(){return {healthy:false as const,errorCode:"BILLING_HEALTHCHECK_SEPARATE"}}
  async verifyWebhook(request:ProviderWebhookRequest){
    const expected=process.env.ASAAS_WEBHOOK_TOKEN,received=request.headers["asaas-access-token"];
    if(!expected||!received)return {valid:false as const,errorCode:"WEBHOOK_TOKEN_INVALID"};
    const left=Buffer.from(expected),right=Buffer.from(received);if(left.length!==right.length||!timingSafeEqual(left,right))return {valid:false as const,errorCode:"WEBHOOK_TOKEN_INVALID"};
    try{const payload=JSON.parse(new TextDecoder().decode(request.rawBody)) as {id?:unknown;account?:{id?:unknown};walletId?:unknown};const externalEventId=String(payload.id??"");const integrationExternalAccountId=String(payload.account?.id??payload.walletId??"");if(!externalEventId||!integrationExternalAccountId)return {valid:false as const,errorCode:"WEBHOOK_PAYLOAD_INVALID"};return {valid:true as const,webhook:{...request,externalEventId,integrationExternalAccountId}}}catch{return {valid:false as const,errorCode:"WEBHOOK_PAYLOAD_INVALID"}}
  }
  async parseWebhook(){return []}
  async sendMessage(){return {ok:false as const,errorCode:"CHANNEL_UNSUPPORTED",temporary:false}}
}
