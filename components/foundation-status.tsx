const foundationItems = ["Next.js", "TypeScript", "Tailwind", "shadcn/ui", "Testes"];

export function FoundationStatus() {
  return (
    <section
      aria-labelledby="foundation-title"
      className="w-full max-w-3xl rounded-2xl border border-[#2A3540] bg-[#171F26] p-6 shadow-2xl shadow-black/20 sm:p-10"
    >
      <div className="mb-8 flex items-center gap-3 border-b border-[#2A3540] pb-6">
        <span className="h-3 w-3 rounded-full bg-[#95E4A5]" aria-hidden="true" />
        <p className="text-sm font-semibold tracking-[0.18em] text-[#95E4A5] uppercase">
          Fundação técnica
        </p>
      </div>

      <h1 id="foundation-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
        FlipSchedule
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[#A9AEB1]">
        A nova fundação Next.js está ativa e preparada para a evolução modular do produto.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Tecnologias validadas">
        {foundationItems.map((item) => (
          <li
            key={item}
            className="flex min-h-14 items-center gap-3 rounded-lg border border-[#2A3540] bg-[#1E2830] px-4 text-sm font-medium"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#95E4A5]" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

      <aside className="mt-8 rounded-lg border border-[#2A3540] bg-[#12181E] p-4 text-sm leading-6 text-[#A9AEB1]">
        O protótipo do Emergent permanece preservado como referência visual e funcional durante a
        reconstrução.
      </aside>
    </section>
  );
}
