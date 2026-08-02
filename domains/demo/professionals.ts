export interface DemoProfessional { id: string; name: string; specialty: string; registration: string; color: string; }
export const demoProfessionals: readonly DemoProfessional[] = [
 { id: "prof-ana", name: "Dra. Mariana Costa", specialty: "Ortodontia", registration: "CRO-SP 0001", color: "hsl(var(--accent))" },
 { id: "prof-caio", name: "Dr. Rafael Lima", specialty: "Implantodontia", registration: "CRO-SP 0002", color: "hsl(var(--info))" },
 { id: "prof-livia", name: "Dra. Camila Rocha", specialty: "Clínica geral", registration: "CRO-SP 0003", color: "hsl(var(--warm))" },
];
