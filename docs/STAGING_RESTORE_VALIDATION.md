# Validação de restore de staging

`staging-restore-validation.yml` valida uma base isolada já restaurada por operador. Exige `VERIFY_STAGING_RESTORE`, origem/destino protegidos e diferentes e usa o contrato genérico `ops:verify-restored-db`. Não executa dump, restore, migration, reset ou exclusão e não acessa production. `ops:verify-backup-restore` permanece exclusivo do rehearsal descartável.
