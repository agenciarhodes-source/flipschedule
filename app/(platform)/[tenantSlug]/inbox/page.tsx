import { MessageSquare } from "lucide-react";

import { ModulePlaceholder } from "@/components/foundation/module-placeholder";

export default function InboxPage() {
  return <ModulePlaceholder eyebrow="Atendimento" title="Inbox" description="Centralize conversas e acompanhe cada contato." icon={MessageSquare} />;
}
