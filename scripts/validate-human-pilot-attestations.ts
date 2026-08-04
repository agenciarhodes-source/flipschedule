import { HUMAN_CHECKS } from "./ops-pilot-technical-readiness";

export const HUMAN_CHECK_ENV_KEYS = {
  clinicApproved: "CLINIC_APPROVED",
  contractApproved: "CONTRACT_APPROVED",
  lgpdApproved: "LGPD_APPROVED",
  trainingCompleted: "TRAINING_COMPLETED",
  supportReady: "SUPPORT_READY",
  incidentContactsReady: "INCIDENT_CONTACTS_READY",
  pilotWindowApproved: "PILOT_WINDOW_APPROVED",
  ownersAssigned: "OWNERS_ASSIGNED",
  pauseCriteriaAccepted: "PAUSE_CRITERIA_ACCEPTED",
  goLiveAccepted: "GO_LIVE_ACCEPTED",
} as const satisfies Record<(typeof HUMAN_CHECKS)[number], string>;

export const HUMAN_ATTESTATION_KEYS = [
  ...HUMAN_CHECKS.map((check) => HUMAN_CHECK_ENV_KEYS[check]),
  "SYNTHETIC_DATA_ONLY_CONFIRMED",
] as const;

export function validateHumanPilotAttestations(env: Record<string, string | undefined> = process.env) {
  const failed = HUMAN_ATTESTATION_KEYS.filter((key) => env[key] !== "true");
  return {
    status: failed.length ? "BLOCKED" as const : "ATTESTATIONS_RECORDED" as const,
    blockerCodes: failed.length ? ["HUMAN_ATTESTATION_INCOMPLETE"] : [],
    requiredCount: HUMAN_ATTESTATION_KEYS.length,
    recordedCount: HUMAN_ATTESTATION_KEYS.length - failed.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateHumanPilotAttestations();
  console.info(JSON.stringify(result));
  if (result.blockerCodes.length) process.exitCode = 1;
}
