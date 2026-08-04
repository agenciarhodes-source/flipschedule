# Evidência sanitizada do piloto

Campos permitidos: `reviewId`, `environment`, `checkedOutSha`, `releaseId`, `migrationsDigest`, `technicalChecks`, `humanAttestations`, `blockerCodes`, `startedAt`, `completedAt`, `finalState`. Estados: `READY_FOR_HUMAN_REVIEW`, `BLOCKED`, `TECHNICAL_FAILURE`.

Proibidos secrets, cookies, e-mails, nomes, URLs de banco, PII, conteúdo clínico, payloads e ciphertext. Evidência vai apenas ao `GITHUB_STEP_SUMMARY` ou arquivo temporário sanitizado, nunca ao banco/aplicação. Checks humanos sem declaração ficam `PENDING_HUMAN_APPROVAL`; não existe aprovação de production.
