import "server-only";

import { getExternalEffectsMode, getRuntimeEnvironment } from "./config";

export class ExternalEffectDisabledError extends Error {
  override name = "ExternalEffectDisabledError";
  constructor() {
    super("Operação externa indisponível neste ambiente controlado.");
  }
}

export function getProductionExternalEffectScopes(
  env: Record<string, string | undefined> = process.env,
) {
  return new Set(
    (env.EXTERNAL_EFFECTS_PRODUCTION_SCOPES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function assertExternalEffectAllowed(
  providerEnvironment: "sandbox" | "production",
  env: Record<string, string | undefined> = process.env,
  productionScope?: string,
) {
  const runtime = getRuntimeEnvironment(env);
  const mode = getExternalEffectsMode(env);

  if (mode === "DISABLED") throw new ExternalEffectDisabledError();

  if (providerEnvironment === "sandbox") {
    if (mode !== "SANDBOX" || runtime === "production") {
      throw new ExternalEffectDisabledError();
    }
    return;
  }

  if (
    mode !== "PRODUCTION" ||
    runtime !== "production" ||
    !productionScope ||
    !getProductionExternalEffectScopes(env).has(productionScope)
  ) {
    throw new ExternalEffectDisabledError();
  }
}
