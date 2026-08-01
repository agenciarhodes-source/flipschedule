import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { AuthConfigurationError } from "@/lib/auth/errors";
import { getAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const requestHeaders = await headers();
    await getAuth().api.signOut({ headers: requestHeaders });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return Response.json({ error: "Authentication service unavailable." }, { status: 503 });
    }

    throw error;
  }
  redirect("/login");
}
