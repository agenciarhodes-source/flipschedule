# Deploy de staging

Ordem: (1) Quality; (2) rehearsal descartável; (3) revisão SQL; (4) snapshot externo; (5) workflow manual de migration staging; (6) deploy do commit aprovado; (7) liveness; (8) readiness; (9) smoke; (10) diagnóstico administrativo; (11) evidências.

Migration nunca roda em build, postinstall, startup, push ou deploy Vercel. Deploy, migration e validação são estados separados. Uma pessoa autorizada deve criar o Environment protegido e aprovações antes da primeira execução.
