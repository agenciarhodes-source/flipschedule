import { LayoutDashboard } from "lucide-react";

import { ModulePlaceholder } from "@/components/foundation/module-placeholder";

export default function DashboardPage() {
  return <ModulePlaceholder eyebrow="Visão geral" title="Dashboard" description="Acompanhe os principais indicadores da operação." icon={LayoutDashboard} />;
}
