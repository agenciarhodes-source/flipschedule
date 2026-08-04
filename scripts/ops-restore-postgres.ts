import { assertRehearsalEnvironment, inspectDump } from "../domains/backup-restore/rehearsal";
import { runPostgresCommand } from "../domains/backup-restore/process";

export async function restorePostgres(tempDirectory: string, dumpPath: string, env = process.env) {
  const { source, restore } = assertRehearsalEnvironment(env);
  const dump = inspectDump(tempDirectory, dumpPath);
  await runPostgresCommand("dropdb", ["--if-exists", restore.database], source);
  await runPostgresCommand("createdb", [restore.database], source);
  await runPostgresCommand("pg_restore", ["--no-owner", "--no-privileges", "--exit-on-error", "--dbname", restore.database, dump.path], restore);
  return { restored: true as const };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [tempDirectory, dumpPath] = process.argv.slice(2);
  if (!tempDirectory || !dumpPath) throw new Error("RESTORE_ARGUMENTS_REQUIRED");
  restorePostgres(tempDirectory, dumpPath).then(() => console.info(JSON.stringify({ restored: true }))).catch(() => { console.error("Restore descartável falhou."); process.exitCode = 1; });
}
