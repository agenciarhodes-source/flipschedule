import { z } from "zod";
export const runtimeEnvironmentSchema=z.enum(["development","test","staging","production"]);
export type RuntimeEnvironment=z.infer<typeof runtimeEnvironmentSchema>;
export function getRuntimeEnvironment(env:Record<string,string|undefined>=process.env):RuntimeEnvironment{const value=env.APP_ENV?.trim();if(value)return runtimeEnvironmentSchema.parse(value);if(env.NODE_ENV==="production")return "production";if(env.NODE_ENV==="test")return "test";return "development"}
export const isSecureRuntimeEnvironment=(env:Record<string,string|undefined>=process.env)=>["staging","production"].includes(getRuntimeEnvironment(env));
