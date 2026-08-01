import { InboxView } from "@/components/modules/inbox/inbox-view";
import { requireAuthenticatedTenantContext } from "@/lib/auth/guards";

export default async function InboxPage() {
  await requireAuthenticatedTenantContext();
  return <InboxView />;
}
