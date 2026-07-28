import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";

export function ModulePlaceholder({ description, eyebrow, icon, title }: Readonly<{ description: string; eyebrow: string; icon: LucideIcon; title: string }>) {
  return <div className="mx-auto max-w-6xl space-y-8"><PageHeader eyebrow={eyebrow} title={title} description={description} /><Card className="overflow-hidden"><div className="flex justify-end border-b border-line px-5 py-3"><StatusBadge tone="info">Migração planejada</StatusBadge></div><EmptyState icon={icon} title={`${title} será migrado em breve`} description="Esta tela valida a navegação e a identidade visual da nova fundação. As regras e os dados do módulo serão implementados em uma fase posterior." /></Card></div>;
}
