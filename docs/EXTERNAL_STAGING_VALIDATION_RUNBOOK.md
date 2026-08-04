# Validação do staging externo

Operador autorizado dispara `external-staging-validation.yml` em `main`, informa `VALIDATE_EXTERNAL_STAGING` e um `changeId` sanitizado. O job `validate` não recebe secrets; o job `verify`, após aprovação do Environment, executa preflight, status de migrations, verificação somente leitura e smoke público. Interrompa diante de qualquer blocker. A saída contém apenas SHA, release, digest, códigos e contagens agregadas; nunca URLs, credenciais ou PII. O workflow não faz deploy, migration ou seed.

## PR 41 — ensaio assistido

Implementados e testáveis localmente: fechamento fail-closed dos blockers P1, política sintética server-side, seed/perfil externo, workflows protegidos, plano e evidência sanitizada. Não executados: Environment/secrets reais, banco ou migration de staging, seed/deploy/smoke/restore externos, revisão ou treinamento humano, piloto e produção.
