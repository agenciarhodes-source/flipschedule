export interface DemoTenant {
  name: string;
  slug: string;
}

const DEMO_TENANTS: Readonly<Record<string, DemoTenant>> = {
  "clinica-vitalita": { name: "Clínica Vitalità", slug: "clinica-vitalita" },
};

export function getDemoTenant(slug: string): DemoTenant {
  return DEMO_TENANTS[slug] ?? { name: "Clínica de demonstração", slug };
}
