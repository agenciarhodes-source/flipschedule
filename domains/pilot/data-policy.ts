import "server-only";

import { getRuntimeEnvironment } from "@/lib/runtime/environment";

export type PilotDataMode = "DISABLED" | "SYNTHETIC_ONLY";
export const PILOT_SYNTHETIC_DATA_REQUIRED = "PILOT_SYNTHETIC_DATA_REQUIRED";
export const SYNTHETIC_MARKERS = ["[SINTÉTICO]", "[SINTETICO]", "PACIENTE SINTÉTICO", "LEAD SINTÉTICO", "DADO EXCLUSIVAMENTE FICTÍCIO"] as const;

export class PilotSyntheticDataError extends Error {
  override name = "PilotSyntheticDataError";
  constructor() { super(PILOT_SYNTHETIC_DATA_REQUIRED); }
}

export function resolvePilotDataMode(env: Record<string, string | undefined> = process.env): PilotDataMode {
  const stagingPilot = getRuntimeEnvironment(env) === "staging" && env.PILOT_MODE === "true";
  if (!stagingPilot) return "DISABLED";
  if (env.PILOT_DATA_MODE !== "SYNTHETIC_ONLY") throw new PilotSyntheticDataError();
  return "SYNTHETIC_ONLY";
}

export function isSyntheticPilotRuntime(env: Record<string, string | undefined> = process.env) {
  return getRuntimeEnvironment(env) === "staging" && env.PILOT_MODE === "true" && resolvePilotDataMode(env) === "SYNTHETIC_ONLY";
}

export function requireSyntheticPilotData(env: Record<string, string | undefined> = process.env) {
  if (!isSyntheticPilotRuntime(env)) throw new PilotSyntheticDataError();
}

const cpf = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
const phone = /(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]*)?9?\d{4}[\s.-]*\d{4}/;
const publicEmail = /\b[A-Z0-9._%+-]+@(?![A-Z0-9.-]*example\.test\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const marked = (value: string) => SYNTHETIC_MARKERS.some((marker) => value.toLocaleUpperCase("pt-BR").includes(marker));

export type SyntheticClinicalInput = { name?: unknown; emailNormalized?: unknown; email?: unknown; phoneE164?: unknown; phone?: unknown; cpf?: unknown; address?: unknown; notes?: unknown; reason?: unknown; source?: unknown; title?: unknown; description?: unknown; preview?: unknown; [key: string]: unknown };

const HUMAN_TEXT_FIELDS = ["name", "emailNormalized", "email", "address", "notes", "reason", "source", "title", "description", "preview"] as const;
const MARKED_TEXT_FIELDS = ["address", "notes", "reason", "source", "title", "description", "preview"] as const;

export function validateSyntheticClinicalInput(input: SyntheticClinicalInput, env: Record<string, string | undefined> = process.env) {
  if (!isSyntheticPilotRuntime(env)) return input;
  const email = input.emailNormalized ?? input.email;
  if (input.cpf || input.phoneE164 || input.phone || (typeof email === "string" && !email.toLowerCase().endsWith("@example.test"))) throw new PilotSyntheticDataError();
  if (typeof input.name === "string" && !marked(input.name)) throw new PilotSyntheticDataError();

  const humanTexts = HUMAN_TEXT_FIELDS
    .map((key) => input[key])
    .filter((value): value is string => typeof value === "string");
  if (humanTexts.some((value) => cpf.test(value) || phone.test(value) || publicEmail.test(value))) throw new PilotSyntheticDataError();

  for (const key of MARKED_TEXT_FIELDS) {
    const value = input[key];
    if (typeof value === "string" && value.trim() && !marked(value)) throw new PilotSyntheticDataError();
  }
  return input;
}
