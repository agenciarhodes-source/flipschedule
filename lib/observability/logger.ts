import "server-only";
type Level="debug"|"info"|"warn"|"error";
const fields=["correlationId","requestId","tenantId","userId","membershipId","platformOperatorId","resourceType","resourceId","provider","status","errorCode","durationMs","attempt"] as const;
type Context=Partial<Record<(typeof fields)[number],string|number>>;
export function structuredLog(level:Level,event:string,context:Context={}){const safe=Object.fromEntries(fields.flatMap(key=>context[key]===undefined?[]:[[key,context[key]]]));const row={timestamp:new Date().toISOString(),level,event,...safe};(level==="error"?console.error:level==="warn"?console.warn:console.info)(JSON.stringify(row));return row}
export function redactSensitive(value:unknown):unknown {if(Array.isArray(value))return value.map(redactSensitive);if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).flatMap(([key,item])=>/(cpf|phone|email|name|message|note|cookie|token|credential|payload|ciphertext|database|checkout.?url|stack)/i.test(key)?[]:[[key,redactSensitive(item)]]));return value}
