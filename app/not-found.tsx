import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <section className="max-w-lg rounded-xl border border-[#2A3540] bg-[#171F26] p-8 text-center">
        <h1 className="text-3xl font-semibold">Página não encontrada</h1>
        <p className="mt-3 text-[#A9AEB1]">O endereço informado não está disponível.</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-[#95E4A5] px-4 py-2 font-medium text-[#12181E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95E4A5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171F26]"
        >
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
