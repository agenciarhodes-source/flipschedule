import {PlanDetailView}from"@/components/modules/treatment-plans/plan-detail-view";
export default async function DemoPlanDetailPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <PlanDetailView planId={id}/>}
