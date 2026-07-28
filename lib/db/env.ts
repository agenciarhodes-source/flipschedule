import { z } from "zod";
import { DatabaseConfigurationError } from "./errors";

const databaseUrlSchema = z.string().trim().min(1).url().refine((value) => /^postgres(?:ql)?:\/\//.test(value));

export function readDatabaseEnv(environment: Record<string, string | undefined> = process.env) {
  const result = databaseUrlSchema.safeParse(environment.DATABASE_URL);
  if (!result.success) throw new DatabaseConfigurationError();
  return { databaseUrl: result.data };
}
