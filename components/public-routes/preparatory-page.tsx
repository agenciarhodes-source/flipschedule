import Link from "next/link";

import { Eyebrow } from "@/components/shared/eyebrow";
import { publicUrls } from "@/lib/config/public-urls";

interface PreparatoryPageProps { eyebrow: string; title: string; description: string; nextStep: string; }

export function PreparatoryPage({ eyebrow, title, description, nextStep }: PreparatoryPageProps) {
  return <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-12 text-ink"><section className="card-surface w-full max-w-xl p-7 md:p-10">
    <Link className="font-display text-2xl" href="/login">Flip<em className="not-italic text-primary">Schedule</em></Link><Eyebrow className="mb-4 mt-10">{eyebrow}</Eyebrow><h1 className="font-display text-4xl">{title}</h1><p className="mt-5 leading-relaxed text-ink-muted">{description}</p>
    <div className="mt-8 rounded-md border border-line bg-bg-elev p-4 text-sm text-ink-muted"><strong className="text-ink">Próxima etapa:</strong> {nextStep}</div>
    <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm"><Link className="text-primary hover:underline" href="/login">Voltar ao login</Link><a className="text-ink-muted hover:text-ink" href={`mailto:${publicUrls.supportEmail}`}>Falar com o suporte</a></div>
  </section></main>;
}
