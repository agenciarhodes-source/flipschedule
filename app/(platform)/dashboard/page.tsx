import { redirect } from "next/navigation";

import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardEntryPage() {
  redirect(await resolvePostLoginDestination());
}
