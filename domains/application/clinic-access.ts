import { z } from "zod";

import type { MembershipRole } from "./context";

const clinicId = z.string().uuid();
const storedClinicAccessSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("ALL") }),
  z.object({
    mode: z.literal("SELECTED"),
    clinicIds: z.array(clinicId).min(1).max(100),
  }),
]);

export type ClinicAccess =
  | { mode: "ALL"; clinicIds: readonly [] }
  | { mode: "SELECTED"; clinicIds: readonly string[] };

const ALL_CLINICS: ClinicAccess = { mode: "ALL", clinicIds: [] };

export function parseClinicAccess(value: unknown, role?: MembershipRole): ClinicAccess {
  if (role === "OWNER" || value === null || value === undefined) return ALL_CLINICS;

  const parsed = storedClinicAccessSchema.safeParse(value);
  if (!parsed.success) {
    // A malformed non-null scope fails closed instead of silently expanding access.
    return { mode: "SELECTED", clinicIds: [] };
  }

  if (parsed.data.mode === "ALL") return ALL_CLINICS;
  return {
    mode: "SELECTED",
    clinicIds: [...new Set(parsed.data.clinicIds)],
  };
}

export function serializeClinicAccess(input: unknown) {
  const parsed = storedClinicAccessSchema.parse(input);
  return parsed.mode === "ALL"
    ? ({ mode: "ALL" } as const)
    : ({ mode: "SELECTED", clinicIds: [...new Set(parsed.clinicIds)] } as const);
}

export function canAccessClinic(
  context: { clinicAccess: ClinicAccess },
  clinicIdToCheck: string,
) {
  return (
    context.clinicAccess.mode === "ALL" ||
    context.clinicAccess.clinicIds.includes(clinicIdToCheck)
  );
}

export function scopedClinicIds(context: { clinicAccess: ClinicAccess }) {
  return context.clinicAccess.mode === "ALL"
    ? null
    : [...context.clinicAccess.clinicIds];
}
