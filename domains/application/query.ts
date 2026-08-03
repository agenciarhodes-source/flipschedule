export type SortDirection = "asc" | "desc";
export interface PageRequest { offset?: number; limit?: number }
export interface PageMetadata { offset: number; limit: number; total: number; hasMore: boolean }
export interface PageResult<T> { items: T[]; page: PageMetadata }
export interface DateRange { from: string; to: string }
export type QueryResult<T> = { ok: true; value: T } | { ok: false; error: ApplicationError };
export class ApplicationError extends Error {
  constructor(readonly code: "INVALID_QUERY" | "NOT_FOUND" | "DATA_ACCESS_ERROR", message: string) {
    super(message); this.name = "ApplicationError";
  }
}
export function normalizePage(page: PageRequest = {}) {
  const offset = Math.max(0, Math.trunc(page.offset ?? 0));
  const limit = Math.min(100, Math.max(1, Math.trunc(page.limit ?? 25)));
  return { offset, limit };
}
export function parseDateRange(range: DateRange) {
  const from = new Date(range.from); const to = new Date(range.to);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) throw new ApplicationError("INVALID_QUERY", "O intervalo de datas é inválido.");
  return { from, to };
}

