import "server-only";
import { createCipheriv,createDecipheriv,randomBytes } from "node:crypto";

function key(){const encoded=process.env.FIELD_ENCRYPTION_KEY;if(!encoded)throw new Error("FIELD_ENCRYPTION_UNAVAILABLE");const value=Buffer.from(encoded,"base64");if(value.length!==32)throw new Error("FIELD_ENCRYPTION_UNAVAILABLE");return value}
export function encryptField(plaintext:string){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);const encrypted=Buffer.concat([cipher.update(plaintext,"utf8"),cipher.final()]);return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`}
export function decryptField(value:string){const [version,iv,tag,data]=value.split(".");if(version!=="v1"||!iv||!tag||!data)throw new Error("FIELD_CIPHERTEXT_INVALID");const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64url"));decipher.setAuthTag(Buffer.from(tag,"base64url"));return Buffer.concat([decipher.update(Buffer.from(data,"base64url")),decipher.final()]).toString("utf8")}
