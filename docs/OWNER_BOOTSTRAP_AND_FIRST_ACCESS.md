# Bootstrap do proprietário e primeiro acesso

## Escopo e critérios de aceite

O fluxo provisiona de forma idempotente o primeiro `Tenant`, a primeira `Clinic`, o `User` proprietário, sua `Membership` `OWNER/ACTIVE`, a credencial Better Auth e um `AuditLog`, em uma única transação. O primeiro login exige substituir a senha temporária, revoga as demais sessões e libera as rotas privadas somente depois da conclusão.

## Development

Use exclusivamente uma conexão direta da branch Neon de development, nunca um host `-pooler`. Configure localmente, sem registrar valores, `DATABASE_URL`, `APP_ENV=development` e as cinco variáveis `BOOTSTRAP_*` documentadas em `.env.example`. Execute `pnpm auth:bootstrap-owner`. A senha deve ter de 12 a 128 caracteres, maiúscula, minúscula, número e caractere especial. O comando não aceita argumentos e imprime apenas o resultado genérico.

A migration `add_owner_bootstrap_and_first_access` é aditiva. Antes de aplicá-la em development, confirme ambiente, backup/restore aplicável e URL direta; execute a migration manualmente. Nesta entrega ela foi criada e revisada, mas não aplicada por automação.

## Production

O workflow manual `Bootstrap production owner` exige o environment protegido `production`, confirmação exatamente `BOOTSTRAP`, os cinco environment secrets e `NEON_PRODUCTION_DIRECT_URL`. Ele tem concorrência exclusiva e executa somente `pnpm auth:bootstrap-owner`: não executa migration, `db push` ou `migrate dev`. Execute-o apenas depois de a migration de produção ter sido aprovada e aplicada pelo fluxo separado.

## Idempotência, auditoria e recuperação

Uma repetição com o mesmo proprietário/tenant retorna sucesso sem redefinir a senha. Estado parcial ou conflitante falha de modo seguro e requer investigação; o comando não tenta apropriar-se de registros preexistentes. Nenhuma senha, hash, token, e-mail ou connection string entra no log operacional. Eventos de bootstrap e conclusão são gravados no `AuditLog` com identificadores opacos.

Não há rollback destrutivo automático. Para falhas antes do commit, a transação não persiste efeitos. Depois do commit, suspenda a identidade por procedimento administrativo auditado; não remova o histórico.
