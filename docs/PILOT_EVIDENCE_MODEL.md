# Evidência sanitizada do piloto

Campos permitidos: `reviewId`, `environment`, `checkedOutSha`, `releaseId`, `migrationsDigest`, `technicalChecks`, `humanAttestations`, `blockerCodes`, `startedAt`, `completedAt`, `finalState`. Estados: `READY_FOR_HUMAN_REVIEW`, `BLOCKED`, `TECHNICAL_FAILURE`.

Proibidos secrets, cookies, e-mails, nomes, URLs de banco, PII, conteúdo clínico, payloads e ciphertext. Evidência vai apenas ao `GITHUB_STEP_SUMMARY` ou arquivo temporário sanitizado, nunca ao banco/aplicação. Checks humanos sem declaração ficam `PENDING_HUMAN_APPROVAL`; não existe aprovação de production.

## PR 41 — ensaio assistido

Implementados e testáveis localmente: fechamento fail-closed dos blockers P1, política sintética server-side, seed/perfil externo, workflows protegidos, plano e evidência sanitizada. Não executados: Environment/secrets reais, banco ou migration de staging, seed/deploy/smoke/restore externos, revisão ou treinamento humano, piloto e produção.
