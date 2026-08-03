import { RealPlansView } from "@/components/modules/treatment-plans/real-plans-view";
import { getApplicationContext } from "@/lib/auth/application-context";import {createPrismaReaders} from "@/domains/infrastructure/prisma/factory";

export default async function OrcamentosPage() {
  const context=await getApplicationContext();const result=await createPrismaReaders(context).treatmentPlans.list({limit:25});
  return <RealPlansView items={result.items} slug={context.tenantSlug}/>;
}
