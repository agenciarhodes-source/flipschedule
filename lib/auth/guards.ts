import "server-only";

import { redirect } from "next/navigation";

import { AuthAccessDeniedError } from "./errors";
import { getAuthenticatedSessionContext } from "./session";

export async function requireAuthenticatedTenantContext() {
  try {
    const context = await getAuthenticatedSessionContext();
    if (context.firstAccessRequired) redirect("/first-access");
    return context;
  } catch (error) {
    if (error instanceof AuthAccessDeniedError) {
      redirect("/login");
    }
    throw error;
  }
}

export async function requireAccessForRoute() {
  try {
    const context = await getAuthenticatedSessionContext();
    if (context.firstAccessRequired) redirect("/first-access");
    return context;
  } catch (error) {
    if (error instanceof AuthAccessDeniedError) {
      redirect("/login");
    }
    throw error;
  }
}
