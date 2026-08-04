# Ensaio efêmero de release de staging

O workflow `staging-release-rehearsal.yml` valida o contrato de `APP_ENV=staging` em PostgreSQL 17 descartável, sem GitHub Environment, secrets persistentes ou provedores externos. Os três valores criptográficos são gerados, mascarados e destruídos no job. Migrations são aplicadas duas vezes para verificar idempotência, seguidas por testes, lint, typecheck, build, manifest e relatório.

O resultado é evidência técnica de CI, não aprovação do staging externo. A frase obrigatória é: “Ensaio efêmero concluído. Nenhum ambiente externo foi validado.”
