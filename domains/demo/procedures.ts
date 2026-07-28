export interface DemoProcedure { id: string; name: string; category: string; durationMinutes: number; priceCents: number; }
export const demoProcedures: readonly DemoProcedure[] = [
 { id: "proc-1", name: "Avaliação inicial", category: "Consulta", durationMinutes: 45, priceCents: 18000 },
 { id: "proc-2", name: "Clareamento", category: "Estética", durationMinutes: 60, priceCents: 120000 },
 { id: "proc-3", name: "Implante unitário", category: "Cirurgia", durationMinutes: 90, priceCents: 380000 },
];
