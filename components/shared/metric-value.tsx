import { cn } from "@/lib/utils";

export function MetricValue({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <span className={cn("font-display text-4xl tabular-nums tracking-[-0.02em]", className)}>{children}</span>;
}
