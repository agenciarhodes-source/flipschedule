# Ativação operacional dos e-mails transacionais

## Escopo

O FlipSchedule possui entrega transacional provider-neutral com adapter Resend, idempotência, fingerprint de destinatário, webhook assinado, deduplicação, bounce, complaint e suppression.

Os fluxos atualmente habilitados no código são:

- recuperação de senha;
- verificação do e-mail principal.

O painel `/admin/email` apresenta apenas diagnóstico sanitizado. Nenhuma chave, endereço completo, corpo, token ou identificador externo é exibido.

## Variáveis necessárias

Configurar somente nos ambientes autorizados:

- `EMAIL_PROVIDER=resend`;
- `RESEND_API_KEY`;
- `EMAIL_FROM`;
- `EMAIL_REPLY_TO`, opcional;
- `RESEND_WEBHOOK_SECRET`;
- `EMAIL_RECIPIENT_HASH_KEY` com valor forte e estável;
- `EXTERNAL_EFFECTS_MODE=SANDBOX` ou modo explicitamente aprovado para o ambiente.

Nunca reutilizar o segredo do Better Auth como chave de fingerprint.

## Ativação externa

Estas etapas não são executadas pelo código nem pelos workflows do repositório:

1. criar ou selecionar a conta Resend;
2. adicionar o domínio de envio;
3. publicar os registros DNS exigidos pelo provider;
4. aguardar a verificação do domínio;
5. criar uma API key restrita ao ambiente;
6. configurar o remetente autorizado;
7. criar o webhook apontando para a rota Resend do FlipSchedule;
8. armazenar o webhook secret no ambiente protegido;
9. confirmar que o deploy utiliza o domínio canônico correto;
10. validar o diagnóstico em `/admin/email`.

Não compartilhar valores de secrets em issues, PRs, logs, screenshots ou mensagens.

## Validação controlada

Antes de liberar produção:

1. usar ambiente de staging ou sandbox;
2. manter dados sintéticos e endereços controlados;
3. confirmar `Configuração válida` no painel;
4. confirmar `Pronto para enviar` somente quando efeitos externos estiverem autorizados;
5. solicitar recuperação de senha para uma conta sintética;
6. confirmar criação de uma única entrega para a mesma referência;
7. confirmar transições `SENT` e `DELIVERED` pelo webhook;
8. simular bounce em endereço controlado pelo provider;
9. confirmar criação da suppression;
10. confirmar que nova tentativa é bloqueada;
11. liberar a suppression somente após validação e confirmação administrativa;
12. repetir o fluxo e registrar a evidência sanitizada.

## Suppressions

Bounce permanente e complaint devem impedir novos envios ao fingerprint correspondente. A liberação manual:

- exige permissão `platform.email.manage`;
- exige motivo operacional;
- exige a confirmação literal `LIBERAR EMAIL`;
- registra auditoria;
- não dispara mensagem automaticamente.

A nova entrega deve partir de um fluxo legítimo, como uma nova solicitação de recuperação ou verificação.

## Falhas

Códigos de falha são sanitizados. O painel pode apresentar, entre outros:

- provider desabilitado;
- configuração inválida;
- efeitos externos bloqueados;
- recipient suppressed;
- falha de request;
- resposta inválida do provider.

O painel não permite reconstruir ou reenviar uma mensagem histórica porque destinatário, corpo e token não são armazenados em texto recuperável. Essa limitação é intencional.

## Rollback

Para interromper imediatamente novos envios:

1. definir `EMAIL_PROVIDER=disabled` ou `EXTERNAL_EFFECTS_MODE=DISABLED`;
2. publicar novo deploy;
3. confirmar no painel que `Pronto para enviar` está pendente;
4. preservar registros existentes para auditoria;
5. não excluir suppressions durante o incidente.

## Estado deste PR

Implementado no código:

- console administrativo de e-mail;
- diagnóstico sanitizado de prontidão;
- filtros e paginação de entregas;
- monitoramento de webhooks;
- consulta e liberação auditada de suppressions;
- permissões administrativas dedicadas;
- testes sem efeitos externos.

Não executado:

- criação de conta Resend;
- configuração de domínio ou DNS;
- criação ou rotação de API key real;
- registro de webhook externo;
- envio real;
- alteração de secrets em staging ou produção.
