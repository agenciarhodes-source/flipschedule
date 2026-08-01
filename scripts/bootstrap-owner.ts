import "dotenv/config";

import { assertBootstrapEnvironment, bootstrapOwner } from "../lib/auth/bootstrap-owner";

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

main().catch(() => {
  process.stderr.write("Owner bootstrap failed.\n");
  process.exitCode = 1;
});
