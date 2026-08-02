import { Eyebrow } from "@/components/shared/eyebrow";
export function MetricCard({ label, value, detail }: Readonly<{ label: string; value: string; detail: string }>) { return <article className="card-surface p-5"><Eyebrow>{label}</Eyebrow><p className="mt-3 font-display text-4xl tabular-nums">{value}</p><p className="mt-2 text-xs text-ink-muted">{detail}</p></article>; }
