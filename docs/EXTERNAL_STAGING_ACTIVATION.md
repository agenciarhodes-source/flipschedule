# Ativação futura do staging externo

## Implementado
Identidade exata de aplicação/banco, política `SYNTHETIC_ONLY`, validação não destrutiva, seed idempotente controlado, smokes e validação de restore previamente realizado.

## Gates
Exigem branch `main`, SHA imutável, Environment `staging`, HTTPS/hostname/banco exatos, migrations atuais, efeitos externos `DISABLED`, Asaas sandbox, owner de plataforma e tenant piloto com OWNER ativo. Variáveis e secrets são configurados futuramente por operador autorizado.

## Não executado
Nenhum staging, banco, GitHub Environment, secret, deploy, migration, seed, smoke remoto, restore, treinamento, piloto ou produção foi criado, acessado ou ativado por este PR.

## PR 41 — ensaio assistido

Implementados e testáveis localmente: fechamento fail-closed dos blockers P1, política sintética server-side, seed/perfil externo, workflows protegidos, plano e evidência sanitizada. Não executados: Environment/secrets reais, banco ou migration de staging, seed/deploy/smoke/restore externos, revisão ou treinamento humano, piloto e produção.
