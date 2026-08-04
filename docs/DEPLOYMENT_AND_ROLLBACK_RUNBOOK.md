# Deploy e rollback

PR, deploy, migration, ativação e validação são gates separados. Antes de staging: revisar diff SQL, duplicidades, backup verificável, impacto de lock, secrets por ambiente e rollback/forward-fix. Aplicar migration somente em job explicitamente autorizado, nunca no build. Executar preflight, migration status, deploy, live/ready e smoke contra staging/preview permitido.

Rollback de aplicação usa artefato anterior compatível. Para schema aditivo, preferir forward-fix; não remover tabela/coluna com dados. Pausar workers e escritas se versões forem incompatíveis. Produção, Vercel, Neon, DNS e migration não foram acessados neste PR.

## Staging controlado (PR 36)
Consulte `STAGING_DEPLOYMENT_RUNBOOK.md`, `STAGING_MIGRATION_RUNBOOK.md` e `STAGING_ROLLBACK_CHECKLIST.md`. Migration manual precede deploy e nunca é acoplada ao build/deploy.

O workflow descartável de backup/restore é um gate técnico independente e não autoriza deploy. Ele não acessa Neon/Vercel, não restaura staging/production e não altera o requisito de snapshot humano antes de migration externa autorizada.
