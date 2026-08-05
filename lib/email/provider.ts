import "server-only";

import { getTransactionalEmailConfiguration } from "./config";
import { TransactionalEmailError, type TransactionalEmailProvider } from "./contract";
import { ResendTransactionalEmailProvider } from "./providers/resend";

let testProvider: TransactionalEmailProvider | null = null;

export function setTransactionalEmailProviderForTesting(provider: TransactionalEmailProvider | null) {
  testProvider = provider;
}

export function getTransactionalEmailProvider(
  env: Record<string, string | undefined> = process.env,
): TransactionalEmailProvider {
  if (testProvider) return testProvider;
  const configuration = getTransactionalEmailConfiguration(env);
  if (configuration.provider === "disabled") {
    throw new TransactionalEmailError("EMAIL_PROVIDER_DISABLED");
  }
  return new ResendTransactionalEmailProvider(configuration, env);
}
