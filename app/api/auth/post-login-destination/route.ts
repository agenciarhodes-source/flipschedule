import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const destination = await resolvePostLoginDestination();

  if (destination === "/login") {
    return Response.json(
      { error: "Authentication required." },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(
    { destination },
    { headers: { "Cache-Control": "no-store" } },
  );
}
