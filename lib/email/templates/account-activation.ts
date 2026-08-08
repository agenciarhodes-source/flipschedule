import "server-only";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]!);
}

export function renderAccountActivationEmail(input: {
  activationUrl: string;
  workspaceName: string;
  expiresAt: Date;
}) {
  const safeUrl = escapeHtml(input.activationUrl);
  const safeWorkspace = escapeHtml(input.workspaceName);
  const expires = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(input.expiresAt);

  return {
    subject: `Ative seu acesso ao FlipSchedule · ${input.workspaceName}`,
    html: `<p>Seu ambiente <strong>${safeWorkspace}</strong> foi criado no FlipSchedule.</p><p>Defina sua senha para concluir o primeiro acesso:</p><p><a href="${safeUrl}">Criar minha senha</a></p><p>Este link é pessoal, de uso único e expira em ${escapeHtml(expires)}.</p><p>Se você não reconhece esta contratação, não utilize o link.</p>`,
    text: `Seu ambiente ${input.workspaceName} foi criado no FlipSchedule. Crie sua senha em ${input.activationUrl}. Este link é pessoal, de uso único e expira em ${expires}.`,
  };
}
