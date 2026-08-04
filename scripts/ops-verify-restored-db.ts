// Compatibility entry point. The verification now requires and compares both
// disposable databases rather than treating connectivity as restore evidence.
import { verifyBackupRestore } from "./ops-verify-backup-restore";

verifyBackupRestore().then((result) => console.info(JSON.stringify({ fingerprintDigest: result.fingerprintDigest, verificationCount: result.verificationCount }))).catch(() => { console.error("Verificação do restore descartável falhou."); process.exitCode = 1; });
