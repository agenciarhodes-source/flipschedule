import { Search } from "lucide-react";

export function SearchInput({ placeholder = "Buscar no FlipSchedule" }: Readonly<{ placeholder?: string }>) {
  return <label className="flex min-h-10 items-center gap-2 rounded-md border border-line bg-bg-elev px-3 text-ink-muted"><Search aria-hidden="true" size={15} /><span className="sr-only">Busca</span><input type="search" placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-dim" /></label>;
}
