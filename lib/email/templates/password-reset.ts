import "server-only";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderPasswordResetEmail(input: { resetUrl: string; expiresAt: Date }) {
  const safeUrl = escapeHtml(input.resetUrl);
  const expiresLabel = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(input.expiresAt);

  const subject = "Redefinição de senha do FlipSchedule";
  const text = [
    "Foi solicitada uma redefinição de senha para sua conta FlipSchedule.",
    "",
    `Use este link até ${expiresLabel}:`,
    input.resetUrl,
    "",
    "Caso você não tenha solicitado a redefinição, ignore esta mensagem.",
    "O suporte do FlipSchedule nunca solicitará sua senha.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#12181e;color:#f3f5f4;font-family:Arial,sans-serif">
    <main style="max-width:560px;margin:0 auto;padding:32px 24px">
      <p style="color:#95e4a5;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">FlipSchedule</p>
      <h1 style="font-size:28px;line-height:1.2;margin:16px 0">Redefina sua senha</h1>
      <p style="line-height:1.6;color:#d7dcda">Foi solicitada uma redefinição de senha para sua conta.</p>
      <p style="margin:28px 0">
        <a href="${safeUrl}" style="display:inline-block;background:#95e4a5;color:#12181e;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:700">Redefinir senha</a>
      </p>
      <p style="line-height:1.6;color:#d7dcda">Este link expira em ${escapeHtml(expiresLabel)}.</p>
      <p style="line-height:1.6;color:#aeb7b3">Caso você não tenha solicitado a redefinição, ignore esta mensagem. O suporte do FlipSchedule nunca solicitará sua senha.</p>
      <p style="font-size:12px;line-height:1.5;color:#84908b;word-break:break-all">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${safeUrl}</p>
    </main>
  </body>
</html>`;

  return { subject, html, text };
}
