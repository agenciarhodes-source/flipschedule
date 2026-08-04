# Backup e restore

Backup real depende do Neon/operador e deve ter criptografia, retenção, região, acesso mínimo e evidência. RPO/RTO ainda não foram definidos. Para ensaio: criar destino isolado sem dados reais fora do ambiente autorizado; registrar snapshot; restaurar pelo procedimento do provider; executar `RESTORED_DATABASE_URL=... SOURCE_DATABASE_URL=... pnpm ops:verify-restored-db`; validar aplicação e destruir o destino conforme retenção.

O script apenas verifica conectividade, migrations e estruturas essenciais, recusa origem=destino e não imprime dados. Ele **não executa nem comprova restore**. Nenhum backup ou restore foi realizado nesta tarefa.

Staging exige confirmação humana de snapshot antes do workflow de migration. Restore não é automatizado; forward-fix é preferido e AuditLog/billing devem ser preservados.

## Rehearsal descartável do PR 39

O rehearsal técnico local está documentado em `BACKUP_RESTORE_REHEARSAL.md`. Ele executa dump custom real e restore real somente entre dois bancos PostgreSQL 17 descartáveis, compara fingerprints, exercita serviços reais e remove o dump. Isso não substitui snapshot/backup gerenciado, restore de staging ou production, nem decide RPO, RTO, retenção ou criptografia do provider.

## Preparação PR 40
A execução externa futura deve seguir [ativação de staging](EXTERNAL_STAGING_ACTIVATION.md), [política sintética](PILOT_DATA_POLICY.md) e [critérios de início/pausa](PILOT_START_STOP_CRITERIA.md). Neste PR, infraestrutura, secrets, deploy, migration/seed/smoke/restore remotos, treinamento, aceite humano, piloto e produção permanecem **não executados**.
