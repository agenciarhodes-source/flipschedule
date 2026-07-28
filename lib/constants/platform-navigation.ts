import { CalendarClock, FileText, LayoutDashboard, MessageSquare, Settings, UserRound, Users } from "lucide-react";

import type { NavigationItemData } from "@/lib/types/navigation";

export function createPlatformNavigation(tenantSlug: string): NavigationItemData[] {
  const base = `/${tenantSlug}`;
  return [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/agenda`, label: "Agenda", icon: CalendarClock },
    { href: `${base}/inbox`, label: "Inbox", icon: MessageSquare },
    { href: `${base}/crm`, label: "CRM", icon: Users },
    { href: `${base}/orcamentos`, label: "Orçamentos", icon: FileText },
    { href: `${base}/pacientes`, label: "Pacientes", icon: UserRound },
    { href: `${base}/configuracoes`, label: "Configurações", icon: Settings },
  ];
}
