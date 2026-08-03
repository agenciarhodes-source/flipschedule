import { z } from "zod";
import type { IntegrationStatus, MessageStatus } from "@/generated/prisma/client";

export const credentialReferenceSchema=z.string().trim().regex(/^env:[A-Z][A-Z0-9_]{2,80}$/);
const forbidden=/token|password|secret|private.?key|credential/i;
export const nonSecretConfigurationSchema=z.record(z.string(),z.union([z.string().max(200),z.number().safe(),z.boolean()])).superRefine((value,ctx)=>{for(const key of Object.keys(value))if(forbidden.test(key))ctx.addIssue({code:"custom",message:"Secret fields are forbidden",path:[key]})});
const messageTransitions:Record<MessageStatus,ReadonlySet<MessageStatus>>={PENDING:new Set(["PROCESSING"]),PROCESSING:new Set(["PENDING","SENT","FAILED"]),SENT:new Set(["DELIVERED","READ","FAILED"]),DELIVERED:new Set(["READ"]),READ:new Set(),FAILED:new Set(["PENDING"]),RECEIVED:new Set()};
export const canTransitionMessageStatus=(from:MessageStatus,to:MessageStatus)=>from===to||messageTransitions[from].has(to);
const integrationTransitions:Record<IntegrationStatus,ReadonlySet<IntegrationStatus>>={DISCONNECTED:new Set(["PENDING","REVOKED"]),PENDING:new Set(["CONNECTED","ERROR","DISCONNECTED","REVOKED"]),CONNECTED:new Set(["ERROR","DISCONNECTED","REVOKED"]),ERROR:new Set(["PENDING","DISCONNECTED","REVOKED"]),REVOKED:new Set()};
export const canTransitionIntegrationStatus=(from:IntegrationStatus,to:IntegrationStatus)=>from===to||integrationTransitions[from].has(to);
export interface Clock {now():Date}
export const systemClock:Clock={now:()=>new Date()};
export const MAX_ATTEMPTS=5;
const delays=[30_000,120_000,600_000,1_800_000,3_600_000] as const;
export function retryAt(attempt:number,clock:Clock=systemClock,jitter:()=>number=Math.random){if(attempt>=MAX_ATTEMPTS)return null;const base=delays[Math.max(0,Math.min(delays.length-1,attempt-1))]!;const bounded=Math.max(0,Math.min(1,jitter()));return new Date(clock.now().getTime()+Math.round(base*(0.8+bounded*0.4)))}
export const isDeadLetter=(x:{status:string;attempts:number;nextAttemptAt:Date|null;lastErrorCode:string|null})=>x.status==="FAILED"&&x.attempts>=MAX_ATTEMPTS&&x.nextAttemptAt===null&&Boolean(x.lastErrorCode);
