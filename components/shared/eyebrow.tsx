import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <p className={cn("font-mono text-[11px] uppercase tracking-[0.15em] text-ink-dim", className)}>{children}</p>;
}
