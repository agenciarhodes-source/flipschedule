import { createHash,randomUUID } from "node:crypto";
export const payloadHash=(body:Uint8Array)=>createHash("sha256").update(body).digest("hex");
export const createCorrelationId=()=>randomUUID();
export function redactPreview(value:string,max=80){return value.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,"[e-mail]").replace(/\+?\d[\d\s().-]{7,}\d/g,"[telefone]").replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,"[cpf]").replace(/https?:\/\/\S+/gi,"[url]").replace(/(?:token|secret|senha)\s*[:=]\s*\S+/gi,"[segredo]").slice(0,max)}
