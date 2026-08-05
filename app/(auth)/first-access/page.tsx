import { redirect } from "next/navigation";

import { FirstAccessForm } from "@/components/auth/first-access-form";
import { SessionInactivityGuard } from "@/components/auth/session-inactivity-guard";
import { Eyebrow } from "@/components/shared/eyebrow";
import { getFirstAccessSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function FirstAccessPage() {
  const session = await getFirstAccessSession();
  if (!session) redirect("/login");
  if (!session.mustChangePassword) redirect(session.destination);

  return (
    <SessionInactivityGuard>
      <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-12 text-ink">
        <section className="w-full max-w-md">
          <Eyebrow className="mb-4">Primeiro acesso da clínica</Eyebrow>
          <h1 className="font-display text-4xl">Crie sua senha definitiva</h1>
          <p className="mt-4 text-ink-muted">
            Este passo é usado somente para acessos de clínicas provisionados com senha temporária.
          </p>
          <FirstAccessForm />
        </section>
      </main>
    </SessionInactivityGuard>
  );
}
