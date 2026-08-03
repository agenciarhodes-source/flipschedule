import "server-only";
const allowed=["event","provider","tenantId","integrationId","messageId","webhookEventId","attempt","status","errorCode","correlationId","durationMs"] as const;
export type OperationalLog=Partial<Record<(typeof allowed)[number],string|number>>;
export function operationalLog(fields:OperationalLog){const safe=Object.fromEntries(allowed.flatMap(k=>fields[k]===undefined?[]:[[k,fields[k]]]));console.info(JSON.stringify(safe))}
