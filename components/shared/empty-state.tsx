import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description }: Readonly<{ icon: LucideIcon; title: string; description: string }>) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 rounded-lg border border-line bg-bg-elev p-3 text-primary"><Icon aria-hidden="true" size={20} /></span>
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
    </div>
  );
}
