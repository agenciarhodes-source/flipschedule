export const STAGING_BLOCKER_CATEGORIES = ["CONFIGURATION", "DATABASE", "MIGRATION", "AUTHENTICATION", "TENANCY", "SYNTHETIC_DATA", "SMOKE", "RESTORE", "SUPPORT", "LEGAL", "TRAINING", "SECURITY"] as const;
export type StagingBlockerCategory = typeof STAGING_BLOCKER_CATEGORIES[number];
export interface StagingBlocker { code: string; category: StagingBlockerCategory; severity: "CRITICAL" | "HIGH"; source: string; blocking: true; remediation: string; evidenceRequired: string; }
const blocker = (code: string, category: StagingBlockerCategory, source: string): StagingBlocker => ({ code, category, severity: "CRITICAL", source, blocking: true, remediation: `Corrigir ${code} e repetir a verificação protegida.`, evidenceRequired: `Resultado sanitizado sem ${code}.` });
export const STAGING_BLOCKERS = [
  blocker("PILOT_ALLOWLIST_INVALID", "TENANCY", "external-staging"),
  blocker("PILOT_SYNTHETIC_DATA_REQUIRED", "SYNTHETIC_DATA", "clinical-write"),
  blocker("RESTORE_DATABASE_IDENTITY_INVALID", "RESTORE", "restore-validation"),
  blocker("HUMAN_ATTESTATION_INCOMPLETE", "SECURITY", "human-readiness"),
] as const;
export const STAGING_BLOCKER_CODES = new Set(STAGING_BLOCKERS.map(({ code }) => code));
