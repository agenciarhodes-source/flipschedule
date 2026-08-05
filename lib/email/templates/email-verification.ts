const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function renderAccountEmailVerification(input: { verificationUrl: string; expiresInMinutes: number }) {
  const verificationUrl = escapeHtml(input.verificationUrl);
  const subject = "Confirme seu e-mail no FlipSchedule";
  const text = [
    "Confirme seu e-mail no FlipSchedule",
    "",
    `Abra o link abaixo para confirmar que este endereço pertence a você. O link expira em ${input.expiresInMinutes} minutos.`,
    input.verificationUrl,
    "",
    "Caso você não tenha solicitado esta confirmação, ignore esta mensagem.",
  ].join("\n");
  const html = `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6"><main style="max-width:560px;margin:0 auto;padding:32px"><h1 style="font-size:24px">Confirme seu e-mail</h1><p>Abra o botão abaixo para confirmar que este endereço pertence a você. O link expira em ${input.expiresInMinutes} minutos.</p><p style="margin:28px 0"><a href="${verificationUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#18181b;color:#fff;text-decoration:none">Confirmar e-mail</a></p><p style="font-size:13px;color:#71717a">Caso você não tenha solicitado esta confirmação, ignore esta mensagem.</p></main></body></html>`;
  return { subject, html, text };
}
