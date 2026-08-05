# Entrega transacional de e-mail

## Escopo do PR 43

O FlipSchedule passa a possuir uma camada global e provider-neutral de e-mail transacional, inicialmente conectada à recuperação segura de senha. A camada de domínio não importa SDK ou contrato específico do Resend. O provider padrão continua sendo `disabled`; import, build, testes e CI não realizam chamadas externas.

O adapter Resend usa a API HTTPS oficial, uma chave de idempotência opaca por token de recuperação e versões HTML e texto geradas localmente. O envio somente é permitido quando `EMAIL_PROVIDER=resend`, a configuração server-only é válida e `EXTERNAL_EFFECTS_MODE=SANDBOX`. Este PR não configura conta, domínio, DNS, API key, webhook ou envio real.

## Persistência e minimização

`TransactionalEmailDelivery` registra somente tipo, provider, identificadores opacos, fingerprint HMAC do destinatário, estado e timestamps. Não são persistidos e-mail bruto, assunto, HTML, texto, link ou token. `TransactionalEmailWebhookEvent` registra apenas o ID único do evento, tipo, ID externo da mensagem e resultado sanitizado. O payload bruto e os headers não são armazenados.

A chave de idempotência da recuperação usa `password-reset/<PasswordResetToken.id>`. O token bruto não participa da chave. O ID externo retornado pelo provider é persistido para correlacionar eventos posteriores.

## Estados

A entrega segue `PENDING → SENT → DELIVERED`, podendo passar por `DELIVERY_DELAYED` ou terminar em `FAILED`, `BOUNCED`, `COMPLAINED` ou `SUPPRESSED`. Eventos mais antigos ou que reduziriam o estado são registrados como processados sem regressão. A entrega de webhooks é tratada como at-least-once e potencialmente fora de ordem.

## Webhook

`POST /api/webhooks/resend` lê o corpo bruto, limita o tamanho, exige JSON e valida `svix-id`, `svix-timestamp` e `svix-signature` antes de confiar no conteúdo. `providerEventId` é único, de modo que repetição não duplica efeitos. Eventos desconhecidos são ignorados com código sanitizado.

Eventos tratados: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed` e `email.suppressed`.

## Suppression

Bounce, complaint e suppression criam ou atualizam `EmailSuppression` usando somente o fingerprint HMAC do destinatário. Uma suppression ativa impede novo envio, revoga o token recém-criado pelo fluxo de recuperação e mantém a mesma resposta pública anti-enumeração. A remoção de suppression não faz parte deste PR.

## Configuração

Variáveis server-only:

- `EMAIL_PROVIDER=disabled|resend`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` opcional
- `RESEND_WEBHOOK_SECRET`
- `EMAIL_RECIPIENT_HASH_KEY`

Nenhuma variável recebe prefixo `NEXT_PUBLIC_`. `EMAIL_RECIPIENT_HASH_KEY` deve ser independente de secrets de autenticação, criptografia e rate limit.

O comando `pnpm ops:email-preflight` valida a configuração sem rede e sem mostrar valores. Em rollback operacional, defina `EMAIL_PROVIDER=disabled`; novas tentativas continuarão respondendo genericamente e seus tokens serão revogados quando a entrega não estiver disponível.

## Ativação futura, não executada

Em PR operacional separado: verificar domínio/subdomínio, configurar SPF/DKIM e política DMARC, criar credenciais separadas por ambiente, registrar o webhook HTTPS, executar o preflight, realizar envio somente a destinatário controlado em staging, verificar eventos e confirmar ausência de PII nos logs. Production exige autorização e rollback aprovados.
