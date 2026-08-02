import "dotenv/config";

import {
  assertBootstrapEnvironment,
  bootstrapOwner,
  classifyBootstrapError,
} from "../lib/auth/bootstrap-owner-core";

async function main() {
  assertBootstrapEnvironment(process.env);
  const result = await bootstrapOwner({
    ownerEmail: process.env.BOOTSTRAP_OWNER_EMAIL ?? "",
    ownerName: process.env.BOOTSTRAP_OWNER_NAME ?? "",
    temporaryPassword: process.env.BOOTSTRAP_OWNER_TEMP_PASSWORD ?? "",
    tenantName: process.env.BOOTSTRAP_TENANT_NAME ?? "",
    tenantSlug: process.env.BOOTSTRAP_TENANT_SLUG ?? "",
  });
  process.stdout.write(result.created ? "Owner bootstrap completed.\n" : "Owner bootstrap already completed.\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`${classifyBootstrapError(error)}\n`);
  process.exitCode = 1;
});
