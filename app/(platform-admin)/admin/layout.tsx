import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { SessionInactivityGuard } from "@/components/auth/session-inactivity-guard";
import { StagingBanner } from "@/components/layout/staging-banner";
import {
  PlatformAccessDeniedError,
  getPlatformContext,
} from "@/lib/auth/platform-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const nav: ReadonlyArray<readonly [string, string]> = [
  ["/admin", "Visão geral"],
  ["/admin/clients", "Clínicas clientes"],
  ["/admin/plans", "Planos"],
  ["/admin/users", "Usuários"],
  ["/admin/subscriptions", "Assinaturas"],
  ["/admin/operations", "Operações"],
  ["/admin/audit", "Auditoria"],
  ["/admin/operators", "Operadores"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  noStore();
  try {
    const context = await getPlatformContext();
    return (
      <SessionInactivityGuard>
        <div className="min-h-screen bg-canvas">
          <StagingBanner />
          <header className="border-b border-line bg-surface px-6 py-4">
            <strong className="font-display text-xl">FlipSchedule · Administração</strong>
            <span className="ml-3 text-sm text-ink-muted">{context.displayName}</span>
          </header>
          <div className="mx-auto grid max-w-7xl gap-6 p-6 md:grid-cols-[220px_1fr]">
            <nav
              aria-label="Administração da plataforma"
              className="flex gap-2 overflow-x-auto md:flex-col"
            >
              {nav.map(([href, label]) => (
                <Link
                  className="rounded-md px-3 py-2 text-sm hover:bg-primary-soft"
                  href={href}
                  key={href}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <main>{children}</main>
          </div>
        </div>
      </SessionInactivityGuard>
    );
  } catch (error) {
    if (error instanceof PlatformAccessDeniedError) {
      redirect("/login?reason=login-required");
    }
    throw error;
  }
}
