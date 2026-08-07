export type CommercialUsageResource = "clinics" | "users";

export interface CommercialPlanLimits {
  readonly maxClinics: number | null;
  readonly maxUsers: number | null;
}

export interface CommercialUsageSnapshot {
  readonly clinics: number;
  readonly users: number;
}

export class CommercialPlanUsageError extends Error {
  readonly code: "CLINIC_LIMIT_REACHED" | "USER_LIMIT_REACHED";

  constructor(
    readonly resource: CommercialUsageResource,
    readonly limit: number,
    readonly current: number,
    readonly requested: number,
  ) {
    const code = resource === "clinics" ? "CLINIC_LIMIT_REACHED" : "USER_LIMIT_REACHED";
    super(code);
    this.name = "CommercialPlanUsageError";
    this.code = code;
  }
}

export function assertCommercialCapacity(input: {
  resource: CommercialUsageResource;
  limit: number | null;
  current: number;
  additional?: number;
}) {
  const additional = input.additional ?? 1;
  if (!Number.isSafeInteger(input.current) || input.current < 0) throw new Error("INVALID_CURRENT_USAGE");
  if (!Number.isSafeInteger(additional) || additional < 0) throw new Error("INVALID_ADDITIONAL_USAGE");
  if (input.limit === null) return;
  if (!Number.isSafeInteger(input.limit) || input.limit < 1) throw new Error("INVALID_COMMERCIAL_LIMIT");

  const requested = input.current + additional;
  if (requested > input.limit) {
    throw new CommercialPlanUsageError(input.resource, input.limit, input.current, requested);
  }
}

export function assertCommercialPlanSupportsUsage(
  limits: CommercialPlanLimits,
  usage: CommercialUsageSnapshot,
) {
  assertCommercialCapacity({
    resource: "clinics",
    limit: limits.maxClinics,
    current: usage.clinics,
    additional: 0,
  });
  assertCommercialCapacity({
    resource: "users",
    limit: limits.maxUsers,
    current: usage.users,
    additional: 0,
  });
}

export function commercialUsageMessage(error: CommercialPlanUsageError) {
  if (error.resource === "clinics") {
    return `Seu plano permite até ${error.limit} unidade(s) ativa(s). Faça upgrade para ativar outra unidade.`;
  }
  return `Seu plano permite até ${error.limit} usuário(s) ativo(s). Faça upgrade para adicionar outro usuário.`;
}
