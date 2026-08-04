import { createHash } from "node:crypto";
import { chmodSync, createReadStream } from "node:fs";
import { assertRehearsalEnvironment, assertSafeDumpPath, inspectDump } from "../domains/backup-restore/rehearsal";
import { runPostgresCommand } from "../domains/backup-restore/process";

export async function sha256File(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function backupPostgres(tempDirectory: string, dumpPath: string, env = process.env) {
  const { source } = assertRehearsalEnvironment(env);
  const safePath = assertSafeDumpPath(tempDirectory, dumpPath);
  await runPostgresCommand("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", safePath], source);
  chmodSync(safePath, 0o600);
  const dump = inspectDump(tempDirectory, safePath);
  return { ...dump, checksumSha256: await sha256File(safePath) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [tempDirectory, dumpPath] = process.argv.slice(2);
  if (!tempDirectory || !dumpPath) throw new Error("BACKUP_ARGUMENTS_REQUIRED");
  backupPostgres(tempDirectory, dumpPath).then((result) => console.info(JSON.stringify({ sizeBytes: result.sizeBytes, checksumSha256: result.checksumSha256 }))).catch(() => { console.error("Backup descartável falhou."); process.exitCode = 1; });
}
