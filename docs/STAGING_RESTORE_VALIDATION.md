# Validação de restore de staging

`staging-restore-validation.yml` valida uma base isolada já restaurada por operador. Exige `VERIFY_STAGING_RESTORE`, origem/destino protegidos e diferentes e usa o contrato genérico `ops:verify-restored-db`. Não executa dump, restore, migration, reset ou exclusão e não acessa production. `ops:verify-backup-restore` permanece exclusivo do rehearsal descartável.

## PR 41 — ensaio assistido

Implementados e testáveis localmente: fechamento fail-closed dos blockers P1, política sintética server-side, seed/perfil externo, workflows protegidos, plano e evidência sanitizada. Não executados: Environment/secrets reais, banco ou migration de staging, seed/deploy/smoke/restore externos, revisão ou treinamento humano, piloto e produção.
