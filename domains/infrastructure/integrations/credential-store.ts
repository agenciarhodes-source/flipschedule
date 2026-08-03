import "server-only";
import type { ProviderCredentials } from "@/domains/application/integrations";
import { credentialReferenceSchema } from "@/domains/application/integrations";
export interface CredentialStore {resolve(reference:string):Promise<ProviderCredentials|null>}
export class EnvironmentCredentialStore implements CredentialStore {async resolve(reference:string){const parsed=credentialReferenceSchema.safeParse(reference);if(!parsed.success)return null;const name=parsed.data.slice(4);const value=process.env[name];return value?{values:{primary:value}}:null}}
