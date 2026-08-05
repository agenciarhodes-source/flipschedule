import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AccessPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-12 text-ink">
      <section className="card-surface w-full max-w-lg p-8">
        <p className="font-mono text-xs uppercase text-primary">Acesso controlado</p>
        <h1 className="mt-3 font-display text-4xl">Seu acesso ainda não foi liberado</h1>
        <p className="mt-4 text-ink-muted">
          O FlipSchedule não possui cadastro público. Uma clínica precisa adicionar seu e-mail e
          definir seu papel antes que o sistema seja liberado.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link className="rounded-md bg-primary px-4 py-3 text-primary-foreground" href="/login">
            Voltar ao login
          </Link>
          <Link className="rounded-md border border-line px-4 py-3" href="/demo">
            Ver demonstração
          </Link>
        </div>
      </section>
    </main>
  );
}
