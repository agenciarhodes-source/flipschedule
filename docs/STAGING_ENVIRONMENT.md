# Contrato do ambiente de staging

Staging é isolado de development, test, previews não confiáveis e production. `APP_ENV=staging` falha fechado e exige origens HTTPS explícitas, URLs do Better Auth, trusted origins, URLs de banco runtime/direta, chaves de criptografia e rate limit e modo operacional. `EXTERNAL_EFFECTS_MODE` inicia em `DISABLED`; `SANDBOX` admite apenas adapters declaradamente sandbox e `ASAAS_ENVIRONMENT=sandbox`. Dados reais e providers production são proibidos.

## Implementado no código
Validação lazy, banner, noindex, efeitos externos, manifest, seed/verificação, workflows e testes. Nenhum valor secreto está documentado.

## Ainda não executado
GitHub Environment/secrets, banco/snapshot, migration, Vercel/deploy/domínio, smoke/seed/restore remotos e aprovação de staging.

> PR 37: o rehearsal efêmero valida somente controles técnicos locais. Environment/secrets, banco, deploy, migration, backup/restore, smoke remoto, piloto e production externos permanecem pendentes de execução e aprovação humanas. Consulte `STAGING_RELEASE_REHEARSAL.md`, `PROTECTED_STAGING_WORKFLOWS.md`, `STAGING_AUTHENTICATION_SECURITY.md` e `STAGING_REHEARSAL_EVIDENCE.md`.
