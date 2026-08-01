import { z } from "zod";

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const normalizeEmailInput = (value: unknown) => {
  const parsed = z.string().trim().min(1).safeParse(value);
  return parsed.success ? normalizeEmail(parsed.data) : undefined;
};

export function isSafeInternalCallback(value: string | null | undefined) {
  if (!value) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  return false;
}
