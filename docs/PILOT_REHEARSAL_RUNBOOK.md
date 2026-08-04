# Runbook do ensaio técnico sintético do piloto

Use somente PostgreSQL local descartável já migrado. Exporte staging, efeitos desabilitados, `PILOT_MODE=true`, allowlist `piloto-sintetico`, confirmação literal e secrets efêmeros distintos. Execute `pnpm ops:pilot-rehearsal`; o agregado não executa migrations.

O workflow cria PostgreSQL 17 e o destrói ao fim. Não usa environment protegido, secret externo, artifact, provider, Vercel, Neon ou staging/production externo. `PASSED` confirma só o check automatizado; `FAILED` viola critério; `BLOCKED` só cabe para dependência ausente e bloqueio crítico falha.

Continuam separados: revisão LGPD/jurídica, backup/restore, staging externo, treinamento, aceite da clínica e go-live.
