import { BillingCallbackStatus } from "@/components/modules/settings/billing-callback-status";
export default async function Page({params}:{params:Promise<{tenantSlug:string}>}){return <BillingCallbackStatus tenantSlug={(await params).tenantSlug} state="expirado"/>}
