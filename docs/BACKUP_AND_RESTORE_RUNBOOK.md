# Backup e restore

Backup real depende do Neon/operador e deve ter criptografia, retenção, região, acesso mínimo e evidência. RPO/RTO ainda não foram definidos. Para ensaio: criar destino isolado sem dados reais fora do ambiente autorizado; registrar snapshot; restaurar pelo procedimento do provider; executar `RESTORED_DATABASE_URL=... SOURCE_DATABASE_URL=... pnpm ops:verify-restored-db`; validar aplicação e destruir o destino conforme retenção.

O script apenas verifica conectividade, migrations e estruturas essenciais, recusa origem=destino e não imprime dados. Ele **não executa nem comprova restore**. Nenhum backup ou restore foi realizado nesta tarefa.
