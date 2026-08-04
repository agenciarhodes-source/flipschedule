# Smoke test de staging

Configure `STAGING_BASE_URL` HTTPS como variável protegida e hostname production distinto. O workflow manual valida live, ready (`2xx` e `status=ready`), login, raiz segura, `X-Robots-Tag` e marcador de homologação. Não usa conta, cookie, token ou dado clínico. Smoke autenticado permanece opcional até existir credencial sintética protegida e mecanismo seguro.

> PR 37: o rehearsal efêmero valida somente controles técnicos locais. Environment/secrets, banco, deploy, migration, backup/restore, smoke remoto, piloto e production externos permanecem pendentes de execução e aprovação humanas. Consulte `STAGING_RELEASE_REHEARSAL.md`, `PROTECTED_STAGING_WORKFLOWS.md`, `STAGING_AUTHENTICATION_SECURITY.md` e `STAGING_REHEARSAL_EVIDENCE.md`.

> PR 38 — Ensaio técnico sintético do piloto: PostgreSQL descartável, dois tenants fictícios, SHA real, migration count dinâmico e efeitos externos bloqueados. Não conclui staging externo, LGPD, piloto humano ou produção.
