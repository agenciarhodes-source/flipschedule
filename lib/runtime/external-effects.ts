import "server-only";
import { getExternalEffectsMode, getRuntimeEnvironment } from "./config";
export class ExternalEffectDisabledError extends Error{override name="ExternalEffectDisabledError";constructor(){super("Operação externa indisponível neste ambiente controlado.")}}
export function assertExternalEffectAllowed(providerEnvironment:"sandbox"|"production",env:Record<string,string|undefined>=process.env){const runtime=getRuntimeEnvironment(env),mode=getExternalEffectsMode(env);if(mode==="DISABLED")throw new ExternalEffectDisabledError();if(mode==="SANDBOX"&&providerEnvironment!=="sandbox")throw new ExternalEffectDisabledError();if(runtime==="staging"&&providerEnvironment!=="sandbox")throw new ExternalEffectDisabledError();}
