# Migration em staging

Revisar migration e compatibilidade, obter snapshot externo verificável e registrar change ID/ref imutável. Disparar `database-migration-staging.yml`, confirmar `MIGRATE_STAGING` e o backup. O job executa preflight, validate/generate, status, deploy e verificação estrutural. Não usar `db push`, `migrate dev`, reset ou seed. Não executar sem banco isolado e secrets protegidos.
