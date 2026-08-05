# Recuperação segura de senha

## Visão geral

O fluxo real de recuperação de senha do FlipSchedule é global à identidade do usuário e não é tenant-scoped. `/forgot-password` recebe somente e-mail, normaliza a entrada e sempre responde com mensagem pública equivalente. `/reset-password` recebe o token do link, permite definir uma nova senha conforme a política existente e exige novo login após sucesso.

## Modelo de ameaça e enumeração

O fluxo não revela se uma conta existe, está ativa, possui Membership ativa, tenants, papéis ou status financeiro. Usuários inexistentes, contas desativadas e falhas recuperáveis de entrega recebem o mesmo texto público: “Se existir uma conta associada a este e-mail, enviaremos as instruções de recuperação.” Logs operacionais usam somente códigos sanitizados e identificadores opacos.

## Tokens

Tokens brutos são gerados com `randomBytes(32)` e codificados em `base64url`. O banco persiste somente SHA-256 do token bruto associado à finalidade explícita `PASSWORD_RESET`; o hash inclui separador de finalidade para impedir confusão entre usos. O prazo padrão é de 30 minutos.

## Persistência, expiração e limpeza

`PasswordResetToken` armazena usuário, finalidade, hash único, expiração, consumo, revogação e timestamps. Novas solicitações revogam tokens válidos anteriores do mesmo usuário em transação. A criação também remove registros expirados/consumidos/revogados antigos daquele usuário após retenção curta, sem worker infinito ou scheduler de produção neste PR.

## Consumo atômico

A redefinição usa transação e `updateMany` condicional por `tokenHash`, finalidade, expiração futura e ausência de consumo/revogação. Apenas uma chamada consegue marcar `consumedAt`; reutilização, token expirado, revogado, consumido, desconhecido ou de outra finalidade retorna mensagem genérica.

## Revogação de sessões e Better Auth

O projeto mantém Better Auth com Prisma adapter e sessões em `AuthSession`. A recuperação não usa o mecanismo nativo de recovery do Better Auth porque este PR exige armazenamento somente de hash e consumo atômico revisável. Após senha aceita, o serviço atualiza a credencial `credential`, marca a troca comprovada (`passwordChangedAt`, `mustChangePassword=false`, `firstAccessCompletedAt`) e remove todas as sessões persistidas do usuário. Nenhuma nova sessão é criada.

## Integração com primeiro acesso

A atualização de hash e campos de segurança foi centralizada em serviço comum para manter coerência entre primeiro acesso e recuperação. A recuperação não ativa usuário, Membership, tenant, billing, entitlement ou papel.

## Rate limiting

A solicitação reutiliza `SecurityRateLimitBucket` via `DurableRateLimiter`, com identidades HMAC derivadas do e-mail normalizado e do IP. O consumo de token também possui limite por IP. IP bruto, e-mail bruto e token bruto não são persistidos no bucket.

## Entrega provider-neutral

A entrega usa a interface server-only `PasswordResetDelivery`. O adapter padrão é desabilitado e lança erro sanitizado; testes podem injetar adapter fake. Sem provedor configurado, a resposta pública permanece genérica, o token recém-criado é revogado e nenhum link completo é logado ou impresso.

## URL segura

A URL é construída com a origem canônica confiável (`NEXT_PUBLIC_APP_URL`, `PUBLIC_APP_ORIGIN` ou `BETTER_AUTH_URL`) e sempre aponta para `/reset-password`. Não há callback externo, domínio fornecido pelo cliente ou open redirect. A rota `/reset-password` recebe `Referrer-Policy: no-referrer` e `Cache-Control: no-store`; o componente client remove o token da barra de endereços após renderização inicial.

## Logs, auditoria e dados proibidos

Eventos sanitizados incluem solicitação, entrega agendada/falha, conclusão, rejeição e rate limit. Nunca registrar e-mail bruto, senha, hash de senha, token, hash do token, link completo, cookies, headers sensíveis, payload bruto, connection string ou secret. `AuditLog` global é gravado somente na conclusão, com `actorUserId`, recurso `User` e metadata mínima sem PII.

## Testes

Os testes cobrem normalização, resposta equivalente para contas inexistentes, armazenamento somente de hash, falha de entrega com revogação, uso único, atualização de senha/campos de primeiro acesso e revogação de sessões. Testes usam adapter fake e não fazem rede.

## Ativação futura de provedor

Um PR futuro deve escolher e documentar provedor transacional, verificação de remetente, secrets por ambiente, webhooks/suppression, runbook operacional e validação em staging. Até lá, nenhum e-mail real é enviado e nenhuma integração é marcada como conectada.

## Rollback

Rollback de código deve desabilitar as server actions e retornar a página preparatória ou mensagem genérica. A migration é aditiva; em rollback operacional, manter registros existentes até decisão de retenção/limpeza e não apagar evidências sem change control.

## Limitações atuais

Nenhum provedor real foi ativado, nenhum secret foi configurado, nenhum scheduler de limpeza de produção foi criado, nenhum ambiente externo foi acessado e nenhuma migration foi aplicada fora do checkout local.

## Entrega transacional — PR 43

O fluxo usa a camada provider-neutral de e-mail. Com `EMAIL_PROVIDER=resend`, configuração válida e efeitos externos explicitamente liberados em sandbox, o template local é enviado com idempotência. Com provider desabilitado, falha de entrega ou suppression, o token recém-criado é revogado e a resposta pública permanece genérica. E-mail, token e link não são persistidos nos registros de entrega nem escritos em logs.

