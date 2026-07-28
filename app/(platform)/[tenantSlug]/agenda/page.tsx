import { CalendarClock } from "lucide-react";

import { ModulePlaceholder } from "@/components/foundation/module-placeholder";

export default function AgendaPage() {
  return <ModulePlaceholder eyebrow="Operação" title="Agenda" description="Organize horários, profissionais e atendimentos da clínica." icon={CalendarClock} />;
}
