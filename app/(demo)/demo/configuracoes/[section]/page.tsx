import { SettingsView,settingsSections,type SettingsSection } from "@/components/modules/settings/settings-view";import { notFound } from "next/navigation";
export function generateStaticParams(){return Object.keys(settingsSections).map(section=>({section}))}
export default async function DemoSettingsSectionPage({params}:{params:Promise<{section:string}>}){const{section}=await params;if(!(section in settingsSections))notFound();return <SettingsView section={section as SettingsSection}/>}
