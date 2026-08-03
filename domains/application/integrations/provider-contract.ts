import type { ConversationChannel, IntegrationProvider } from "@/generated/prisma/client";

export interface ProviderCredentials { readonly values: Readonly<Record<string, string>> }
export interface ProviderExecutionContext { integrationId:string; tenantId:string; correlationId:string; configuration:Readonly<Record<string, unknown>>; credentials:ProviderCredentials }
export interface ProviderWebhookRequest { provider:IntegrationProvider; headers:Readonly<Record<string,string>>; rawBody:Uint8Array; receivedAt:Date }
export interface VerifiedProviderWebhook extends ProviderWebhookRequest { externalEventId:string; integrationExternalAccountId:string }
export type ProviderEvent =
  | {type:"InboundMessageReceived";externalMessageId:string;externalConversationId:string;channel:ConversationChannel;body:string}
  | {type:"MessageSent"|"MessageDelivered"|"MessageRead"|"MessageFailed";externalMessageId:string};
export interface ProviderSendMessageRequest { context:ProviderExecutionContext; channel:ConversationChannel; destination:string; body:string; idempotencyKey:string }
export type ProviderSendMessageResult = {ok:true;externalMessageId:string}|{ok:false;errorCode:string;temporary:boolean};
export type ProviderHealthResult = {healthy:true}|{healthy:false;errorCode:string};
export type ProviderConfigurationResult = {valid:true;configuration:Readonly<Record<string,unknown>>}|{valid:false;errorCode:string};
export type ProviderWebhookVerificationResult = {valid:true;webhook:VerifiedProviderWebhook}|{valid:false;errorCode:string};

export interface IntegrationProviderAdapter {
 readonly provider: IntegrationProvider;
 supportsChannel(channel:ConversationChannel):boolean;
 validateConfiguration(configuration:unknown):Promise<ProviderConfigurationResult>;
 healthCheck(context:ProviderExecutionContext):Promise<ProviderHealthResult>;
 verifyWebhook(request:ProviderWebhookRequest):Promise<ProviderWebhookVerificationResult>;
 parseWebhook(request:VerifiedProviderWebhook):Promise<ProviderEvent[]>;
 sendMessage(request:ProviderSendMessageRequest):Promise<ProviderSendMessageResult>;
}
export interface ProviderReconciliationResult {status:"SENT"|"DELIVERED"|"READ"|"FAILED"|"UNCHANGED";errorCode?:string}
export interface ProviderReconciliationAdapter {reconcileMessage(context:ProviderExecutionContext,externalMessageId:string):Promise<ProviderReconciliationResult>}
