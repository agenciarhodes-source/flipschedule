import { getAsaasProductionBillingReadiness } from "../domains/infrastructure/billing/asaas-runtime";

export function runAsaasProductionBillingPreflight(
  env: Record<string, string | undefined> = process.env,
) {
  return getAsaasProductionBillingReadiness(env);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const readiness = runAsaasProductionBillingPreflight();
  console.info(JSON.stringify(readiness));
  if (!readiness.ready) process.exitCode = 1;
}
