export function TenantDisplay({ name }: Readonly<{ name: string }>) {
  return <div className="rounded-md border border-line bg-bg-elev px-3 py-2"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-dim">Clínica ativa</p><p className="mt-0.5 truncate text-sm">{name}</p></div>;
}
