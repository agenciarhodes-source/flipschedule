export interface DemoPatient { id: string; name: string; phone: string; tags: readonly string[]; lifetimeValueCents: number; lastVisitAt: string; }
export const demoPatients: readonly DemoPatient[] = [
 { id: "patient-1", name: "Marina Alves", phone: "+5586991112233", tags: ["Ortodontia", "Ativa"], lifetimeValueCents: 485000, lastVisitAt: "2026-09-12T14:00:00.000Z" },
 { id: "patient-2", name: "João Pedro Lima", phone: "+5586992223344", tags: ["Implante"], lifetimeValueCents: 720000, lastVisitAt: "2026-09-08T10:30:00.000Z" },
 { id: "patient-3", name: "Beatriz Nunes", phone: "+5586993334455", tags: ["Avaliação"], lifetimeValueCents: 18000, lastVisitAt: "2026-09-01T09:00:00.000Z" },
];
