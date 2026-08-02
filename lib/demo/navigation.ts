import { BarChart3, CalendarDays, FileText, Inbox, LayoutDashboard, Settings, Shield, UserRound, UsersRound } from "lucide-react";

import type { NavigationItemData } from "@/lib/types/navigation";

export const demoNavigation: readonly NavigationItemData[] = [
  { href: "/demo/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/demo/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/demo/crm", label: "CRM", icon: UsersRound },
  { href: "/demo/pacientes", label: "Pacientes", icon: UserRound },
  { href: "/demo/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/demo/inbox", label: "Inbox", icon: Inbox },
  { href: "/demo/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/demo/configuracoes", label: "Configurações", icon: Settings },
  { href: "/demo/admin", label: "Administração", icon: Shield },
] as const;

export const demoPageDescriptions = Object.fromEntries(demoNavigation.map((item) => [item.href, item.label]));
