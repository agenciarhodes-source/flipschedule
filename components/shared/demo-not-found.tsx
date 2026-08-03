import Link from "next/link";
import { FileQuestion } from "lucide-react";

export function DemoNotFound({ kind = "registro", returnHref = "/demo/dashboard", returnLabel = "Voltar ao dashboard" }: Readonly<{ kind?: string; returnHref?: string; returnLabel?: string }>) {
  return (
    <section role="status" className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
      <span className="rounded-lg border border-line bg-bg-elev p-4 text-primary"><FileQuestion aria-hidden="true" size={24} /></span>
      <p className="mt-5 font-mono text-xs uppercase tracking-wider text-ink-dim">Modo demonstração</p>
      <h1 className="mt-2 font-display text-4xl">{kind} não encontrado</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">Este conteúdo fictício não existe ou não está mais disponível. Nenhuma alteração foi realizada.</p>
      <Link href={returnHref} className="button-primary mt-6">{returnLabel}</Link>
    </section>
  );
}
