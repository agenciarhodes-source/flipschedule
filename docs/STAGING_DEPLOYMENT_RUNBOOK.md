# Deploy de staging

Ordem: (1) Quality; (2) rehearsal descartável; (3) revisão SQL; (4) snapshot externo; (5) workflow manual de migration staging; (6) deploy do commit aprovado; (7) liveness; (8) readiness; (9) smoke; (10) diagnóstico administrativo; (11) evidências.

Migration nunca roda em build, postinstall, startup, push ou deploy Vercel. Deploy, migration e validação são estados separados. Uma pessoa autorizada deve criar o Environment protegido e aprovações antes da primeira execução.

> PR 37: o rehearsal efêmero valida somente controles técnicos locais. Environment/secrets, banco, deploy, migration, backup/restore, smoke remoto, piloto e production externos permanecem pendentes de execução e aprovação humanas. Consulte `STAGING_RELEASE_REHEARSAL.md`, `PROTECTED_STAGING_WORKFLOWS.md`, `STAGING_AUTHENTICATION_SECURITY.md` e `STAGING_REHEARSAL_EVIDENCE.md`.

## Preparação PR 40
A execução externa futura deve seguir [ativação de staging](EXTERNAL_STAGING_ACTIVATION.md), [política sintética](PILOT_DATA_POLICY.md) e [critérios de início/pausa](PILOT_START_STOP_CRITERIA.md). Neste PR, infraestrutura, secrets, deploy, migration/seed/smoke/restore remotos, treinamento, aceite humano, piloto e produção permanecem **não executados**.
