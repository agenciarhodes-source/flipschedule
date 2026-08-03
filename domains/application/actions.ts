export type ActionErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "ACCESS_DENIED" | "CONFLICT" | "STALE_DATA" | "UNAVAILABLE";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ActionErrorCode; message: string; fieldErrors?: Record<string, string[]> };

export const actionFailure = (code: ActionErrorCode, message: string, fieldErrors?: Record<string, string[]>): ActionResult<never> =>
  ({ ok: false, code, message, ...(fieldErrors ? { fieldErrors } : {}) });
