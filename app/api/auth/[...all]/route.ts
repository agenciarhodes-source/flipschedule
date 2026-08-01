import { AuthConfigurationError } from "@/lib/auth/errors";
import { getAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(request: Request) {
  try {
    return await getAuth().handler(request);
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return Response.json({ error: "Authentication service unavailable." }, { status: 503 });
    }

    throw error;
  }
}

export { handler as GET, handler as POST };
