export interface DemoProfessional { id: string; name: string; specialty: string; registration: string; color: string; }
export const demoProfessionals: readonly DemoProfessional[] = [
 { id: "prof-ana", name: "Dra. Ana Ribeiro", specialty: "Ortodontia", registration: "CRO-PI 0001", color: "hsl(var(--accent))" },
 { id: "prof-caio", name: "Dr. Caio Mendes", specialty: "Implantodontia", registration: "CRO-PI 0002", color: "hsl(var(--info))" },
 { id: "prof-livia", name: "Dra. Lívia Torres", specialty: "Clínica geral", registration: "CRO-PI 0003", color: "hsl(var(--warm))" },
];
