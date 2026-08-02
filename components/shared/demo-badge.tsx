import { FlaskConical } from "lucide-react";

export function DemoBadge() {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-info"><FlaskConical aria-hidden="true" size={12} />Modo demonstração</span>;
}
