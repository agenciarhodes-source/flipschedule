# Migration em staging

Revisar migration e compatibilidade, obter snapshot externo verificável e registrar change ID/ref imutável. Disparar `database-migration-staging.yml`, confirmar `MIGRATE_STAGING` e o backup. O job executa preflight, validate/generate, status, deploy e verificação estrutural. Não usar `db push`, `migrate dev`, reset ou seed. Não executar sem banco isolado e secrets protegidos.

> PR 37: o rehearsal efêmero valida somente controles técnicos locais. Environment/secrets, banco, deploy, migration, backup/restore, smoke remoto, piloto e production externos permanecem pendentes de execução e aprovação humanas. Consulte `STAGING_RELEASE_REHEARSAL.md`, `PROTECTED_STAGING_WORKFLOWS.md`, `STAGING_AUTHENTICATION_SECURITY.md` e `STAGING_REHEARSAL_EVIDENCE.md`.
