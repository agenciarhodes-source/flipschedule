export const HUMAN_ATTESTATION_KEYS = ["CLINIC", "LEGAL", "TRAINING", "SUPPORT", "INCIDENT", "SYNTHETIC"] as const;
export function validateHumanPilotAttestations(env: Record<string, string | undefined> = process.env) {
  const failed = HUMAN_ATTESTATION_KEYS.filter((key) => env[key] !== "true");
  return { status: failed.length ? "BLOCKED" as const : "ATTESTATIONS_RECORDED" as const, blockerCodes: failed.length ? ["HUMAN_ATTESTATION_INCOMPLETE"] : [] };
}
if (import.meta.url === `file://${process.argv[1]}`) { const result = validateHumanPilotAttestations(); console.info(JSON.stringify(result)); if (result.blockerCodes.length) process.exitCode = 1; }
