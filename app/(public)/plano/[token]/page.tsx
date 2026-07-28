import { DemoPublicPlan } from "@/components/public-plan/demo-public-plan";
export default async function PublicPlanPage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <DemoPublicPlan token={token}/>}
