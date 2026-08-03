import { PatientProfileView } from "@/components/modules/patients/patient-profile-view";
export default async function DemoPatientProfilePage({params}:{params:Promise<{id:string}>}){return <PatientProfileView patientId={(await params).id}/>}
