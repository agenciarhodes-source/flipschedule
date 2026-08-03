import { PatientProfileView } from "@/components/modules/patients/patient-profile-view";
import { DemoNotFound } from "@/components/shared/demo-not-found";
import { demoPatients } from "@/domains/demo";

export default async function DemoPatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!demoPatients.some((patient) => patient.id === id)) return <DemoNotFound kind="Paciente" returnHref="/demo/pacientes" returnLabel="Voltar para pacientes" />;
  return <PatientProfileView patientId={id} />;
}
