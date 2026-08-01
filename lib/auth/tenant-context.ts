import "server-only";

import { getAuthenticatedSessionContext } from "./session";

export async function getTenantContext() {
  return getAuthenticatedSessionContext();
}
