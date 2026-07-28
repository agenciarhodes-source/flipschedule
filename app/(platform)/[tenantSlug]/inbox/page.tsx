import { FoundationPage } from "@/components/foundation/foundation-page";

interface InboxPageProps { params: Promise<{ tenantSlug: string }>; }

export default async function InboxPage({ params }: InboxPageProps) {
  const { tenantSlug } = await params;
  return <FoundationPage title="Inbox" context={`Tenant: ${tenantSlug}`} />;
}
