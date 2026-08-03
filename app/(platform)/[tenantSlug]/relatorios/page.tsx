import {RealReportsView} from "@/components/modules/reports/real-reports-view";
import {createPrismaReaders} from "@/domains/infrastructure/prisma/factory";
import {getApplicationContext} from "@/lib/auth/application-context";

export default async function ReportsPage({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){const context=await getApplicationContext(),query=await searchParams,valid=(value?:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value??"")?new Date(`${value}T00:00:00.000Z`):null,now=new Date(),selectedTo=valid(query.to),to=selectedTo?new Date(selectedTo.getTime()+864e5):now,from=valid(query.from)??new Date(to.getTime()-30*864e5);const report=await createPrismaReaders(context).reports.read({from:from.toISOString(),to:to.toISOString()});return <RealReportsView report={report} timezone={context.tenantTimezone}/>}
