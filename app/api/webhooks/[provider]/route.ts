import { NextResponse,type NextRequest } from "next/server";
import { getPrismaClient } from "@/lib/db";
import { ProviderRegistry } from "@/domains/application/integrations";
import { AsaasWebhookAdapter } from "@/domains/infrastructure/billing/asaas-webhook-adapter";
import { MAX_WEBHOOK_BYTES,parseProvider,WebhookIngressService } from "@/domains/infrastructure/integrations/webhook-ingress";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{provider:string}>}){const provider=parseProvider((await params).provider);if(!provider)return NextResponse.json({error:"Not found"},{status:404});const length=Number(request.headers.get("content-length")??0);if(length>MAX_WEBHOOK_BYTES)return NextResponse.json({error:"Payload too large"},{status:413});const body=new Uint8Array(await request.arrayBuffer());if(body.byteLength>MAX_WEBHOOK_BYTES)return NextResponse.json({error:"Payload too large"},{status:413});const headers=Object.fromEntries(request.headers.entries());const registry=new ProviderRegistry([new AsaasWebhookAdapter()]);const result=await new WebhookIngressService(getPrismaClient(),registry).accept(provider,headers,body);return NextResponse.json(result.status===202?{accepted:true}:result.status===200?{accepted:true,duplicate:true}:{error:"Request rejected"},{status:result.status})}
