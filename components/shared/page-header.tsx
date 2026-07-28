import { Eyebrow } from "@/components/shared/eyebrow";

export function PageHeader({ eyebrow, title, description }: Readonly<{ eyebrow: string; title: string; description: string }>) {
  return (
    <header className="space-y-3">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="font-display text-4xl leading-tight md:text-5xl">{title}</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-ink-muted md:text-base">{description}</p>
    </header>
  );
}
