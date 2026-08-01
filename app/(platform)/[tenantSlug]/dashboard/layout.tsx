import { redirect } from "next/navigation";

import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await requireAuthenticatedTenantContext();
  if (!context) {
    redirect("/login");
  }
  return <>{children}</>;
}
