import { PRODUCT_NAME } from "@/lib/constants/product";

interface FoundationPageProps {
  title: string;
  context?: string;
}

export function FoundationPage({ title, context }: FoundationPageProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-xl border border-border bg-[var(--background-alt)] p-8">
        <p className="mb-3 font-mono text-sm text-[var(--accent)]">Nova fundação Next.js</p>
        <h1 className="font-display text-4xl text-foreground">{title}</h1>
        {context ? <p className="mt-4 text-[var(--foreground-muted)]">{context}</p> : null}
        <p className="mt-8 text-sm text-[var(--foreground-dim)]">{PRODUCT_NAME}</p>
      </section>
    </main>
  );
}
