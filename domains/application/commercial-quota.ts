export type CommercialQuotaState = {
  used: number;
  limit: number | null;
  remaining: number | null;
  reached: boolean;
};

export function commercialQuotaState(used: number, limit: number | null): CommercialQuotaState {
  if (!Number.isInteger(used) || used < 0) throw new Error("INVALID_QUOTA_USAGE");
  if (limit !== null && (!Number.isInteger(limit) || limit < 0)) {
    throw new Error("INVALID_QUOTA_LIMIT");
  }
  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    reached: limit !== null && used >= limit,
  };
}

export function commercialQuotaAllows(
  used: number,
  limit: number | null,
  additional = 1,
) {
  if (!Number.isInteger(additional) || additional < 0) throw new Error("INVALID_QUOTA_INCREMENT");
  const state = commercialQuotaState(used, limit);
  return state.limit === null || state.used + additional <= state.limit;
}
