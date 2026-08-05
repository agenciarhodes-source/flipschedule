import { redirect } from "next/navigation";

import { requireAccessForRoute } from "@/lib/auth/guards";
import { buildTenantDashboardPath } from "@/lib/auth/post-login";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardEntryPage() {
  const context = await requireAccessForRoute();
  redirect(buildTenantDashboardPath(context.tenantSlug));
}
