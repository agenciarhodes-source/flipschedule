import { spawn } from "node:child_process";
import type { DisposableDatabase } from "./rehearsal";

const allowedCommands = new Set(["pg_dump", "pg_restore", "createdb", "dropdb"]);

export function libpqEnvironment(database: DisposableDatabase) {
  const tempRoot = process.env.BACKUP_RESTORE_TEMP_ROOT?.trim();
  return {
    PATH: process.env.PATH,
    NODE_ENV: process.env.NODE_ENV ?? "production",
    ...(tempRoot ? { BACKUP_RESTORE_TEMP_ROOT: tempRoot } : {}),
    PGHOST: database.url.hostname,
    PGPORT: database.url.port || "5432",
    PGUSER: decodeURIComponent(database.url.username),
    PGPASSWORD: decodeURIComponent(database.url.password),
    PGDATABASE: database.database,
    PGSSLMODE: "disable",
  };
}

export async function runPostgresCommand(command: string, args: readonly string[], database: DisposableDatabase) {
  if (!allowedCommands.has(command) || args.some((arg) => /[\n\r\0]/.test(arg))) throw new Error("POSTGRES_COMMAND_DENIED");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, [...args], { env: libpqEnvironment(database), shell: false, stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", () => undefined);
    child.once("error", () => reject(new Error("POSTGRES_CLIENT_UNAVAILABLE")));
    child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`${command.toUpperCase()}_FAILED`)));
  });
}
