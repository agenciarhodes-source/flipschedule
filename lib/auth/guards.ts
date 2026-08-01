import "server-only";

import { redirect } from "next/navigation";

import { AuthAccessDeniedError } from "./errors";
import { getAuthenticatedSessionContext } from "./session";

export async function requireAuthenticatedTenantContext() {
  try {
    return await getAuthenticatedSessionContext();
  } catch (error) {
    if (error instanceof AuthAccessDeniedError) {
      redirect("/login");
    }
    throw error;
  }
}

export async function requireAccessForRoute() {
  try {
    return await getAuthenticatedSessionContext();
  } catch (error) {
    if (error instanceof AuthAccessDeniedError) {
      redirect("/login");
    }
    throw error;
  }
}
