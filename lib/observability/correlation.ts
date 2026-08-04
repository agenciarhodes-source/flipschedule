import { randomUUID } from "node:crypto";
const REQUEST_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
export function resolveCorrelationId(value:string|null|undefined){return value&&REQUEST_ID.test(value)?value:randomUUID()}
export const correlationHeaders=(id:string)=>({"x-request-id":id,"x-correlation-id":id});
