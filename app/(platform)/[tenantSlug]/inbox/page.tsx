import { RealInboxView } from "@/components/modules/inbox/real-inbox-view";
import { getApplicationContext } from "@/lib/auth/application-context";import {createPrismaReaders} from "@/domains/infrastructure/prisma/factory";

export default async function InboxPage() {
  const context=await getApplicationContext();const result=await createPrismaReaders(context).conversations.list({limit:30});
  return <RealInboxView items={result.items}/>;
}
