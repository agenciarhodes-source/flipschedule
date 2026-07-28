import { cn } from "@/lib/utils";

const tones = { neutral: "border-line text-ink-muted", positive: "border-primary/30 bg-primary/5 text-primary", warning: "border-warm/30 bg-warm/5 text-warm", danger: "border-danger/30 bg-danger/5 text-danger", info: "border-info/30 bg-info/5 text-info" } as const;

export function StatusBadge({ children, tone = "neutral" }: Readonly<{ children: React.ReactNode; tone?: keyof typeof tones }>) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider", tones[tone])}>{children}</span>;
}
