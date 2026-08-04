import "server-only";
import { z } from "zod";

export const runtimeEnvironmentSchema=z.enum(["development","test","staging","production"]);
export type RuntimeEnvironment=z.infer<typeof runtimeEnvironmentSchema>;
export type ExternalEffectsMode="DISABLED"|"SANDBOX";
export class RuntimeConfigurationError extends Error { override name="RuntimeConfigurationError"; constructor(public readonly code="RUNTIME_CONFIGURATION_INVALID"){super("A configuração operacional não está disponível.")} }

export function getRuntimeEnvironment(env:Record<string,string|undefined>=process.env):RuntimeEnvironment {
  const explicit=env.APP_ENV?.trim();
  if(explicit){const parsed=runtimeEnvironmentSchema.safeParse(explicit);if(!parsed.success)throw new RuntimeConfigurationError();return parsed.data}
  const node=env.NODE_ENV?.trim();
  if(node==="production")return "production";
  if(node==="test")return "test";
  return "development";
}
export const isProductionRuntime=(env:Record<string,string|undefined>=process.env)=>getRuntimeEnvironment(env)==="production";
export const isStagingRuntime=(env:Record<string,string|undefined>=process.env)=>getRuntimeEnvironment(env)==="staging";
export function getExternalEffectsMode(env:Record<string,string|undefined>=process.env):ExternalEffectsMode {const value=env.EXTERNAL_EFFECTS_MODE?.trim()??"DISABLED";if(value!=="DISABLED"&&value!=="SANDBOX")throw new RuntimeConfigurationError();if(getRuntimeEnvironment(env)==="production"&&value==="SANDBOX")throw new RuntimeConfigurationError();return value}
export function getPublicApplicationOrigin(env:Record<string,string|undefined>=process.env){const environment=getRuntimeEnvironment(env),raw=env.NEXT_PUBLIC_APP_URL??env.PUBLIC_APP_ORIGIN??env.BETTER_AUTH_URL;if(!raw){if(environment==="production"||environment==="staging")throw new RuntimeConfigurationError();return new URL("http://localhost:3000")}try{const url=new URL(raw);if((environment==="production"||environment==="staging")&&url.protocol!=="https:")throw new Error();return url}catch{throw new RuntimeConfigurationError()}}
export function requireRuntimeSecretReference(name:string,minLength=24,env:Record<string,string|undefined>=process.env){const value=env[name]?.trim();if(!value||value.length<minLength)throw new RuntimeConfigurationError("RUNTIME_SECRET_UNAVAILABLE");return value}
export function validateRuntimeConfiguration(env:Record<string,string|undefined>=process.env){const issues:string[]=[];let environment:RuntimeEnvironment;try{environment=getRuntimeEnvironment(env)}catch{return {environment:null,valid:false,issues:["APP_ENV_INVALID"] as string[]}}try{getPublicApplicationOrigin(env)}catch{issues.push("PUBLIC_ORIGIN_INVALID")}try{getExternalEffectsMode(env)}catch{issues.push("EXTERNAL_EFFECTS_MODE_INVALID")}
  if(environment==="production"||environment==="staging"){
    const required=environment==="staging"?["NEXT_PUBLIC_APP_URL","BETTER_AUTH_URL","BETTER_AUTH_TRUSTED_ORIGINS","DATABASE_URL","DIRECT_DATABASE_URL","FIELD_ENCRYPTION_KEY","RATE_LIMIT_HASH_KEY","OPERATIONAL_MODE"]:["DATABASE_URL","BETTER_AUTH_SECRET","RATE_LIMIT_HASH_KEY"];
    for(const key of required)if(!env[key]?.trim())issues.push(`${key}_MISSING`);
  }
  if(environment==="staging"&&(env.ASAAS_ENVIRONMENT??"sandbox").toLowerCase()!=="sandbox")issues.push("ASAAS_PRODUCTION_DENIED");
  if(env.OPERATIONAL_MODE&&!new Set(["NORMAL","READ_ONLY","MAINTENANCE"]).has(env.OPERATIONAL_MODE))issues.push("OPERATIONAL_MODE_INVALID");if(env.PILOT_MODE==="true"&&!env.PILOT_TENANT_SLUGS?.trim())issues.push("PILOT_ALLOWLIST_EMPTY");return {environment,valid:issues.length===0,issues};}
