# Execução assistida de staging externo

O workflow `External staging assisted rehearsal` usa PostgreSQL 17 descartável, efeitos externos desabilitados e dados exclusivamente sintéticos. Ele ensaia preflight, migrations locais, seed idempotente, verificações, testes e build. Não acessa nem aprova staging externo, Neon, Vercel, piloto humano ou produção.

## Critérios de aceite

Todos os gates técnicos devem passar; qualquer blocker interrompe a sequência. A execução externa futura exige aprovação humana, Environment protegido, snapshot e confirmações literais descritas pelo plano `pnpm ops:staging-assisted-plan`.
