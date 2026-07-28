import { z } from "zod";
import { DatabaseConfigurationError } from "./errors";

const databaseUrlSchema = z.string().trim().min(1).url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "postgresql:" || protocol === "postgres:";
});

export function readDatabaseEnv(environment: NodeJS.ProcessEnv = process.env) {
  const result = databaseUrlSchema.safeParse(environment.DATABASE_URL);
  if (!result.success) throw new DatabaseConfigurationError();
  return { databaseUrl: result.data };
}
