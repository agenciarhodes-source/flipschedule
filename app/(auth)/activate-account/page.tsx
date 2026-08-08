import { ActivateAccountForm } from "./activate-account-form";

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_34%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-6 py-12">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <div className="w-full rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2563eb]">
            Primeiro acesso
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            Ative sua conta
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Defina sua senha para concluir a ativação do ambiente contratado no FlipSchedule.
          </p>
          {token ? (
            <ActivateAccountForm token={token} />
          ) : (
            <p role="alert" className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              Este link de ativação é inválido ou expirou.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export const metadata = { other: { referrer: "no-referrer" } };
