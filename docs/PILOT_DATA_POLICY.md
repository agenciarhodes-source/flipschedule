# Política de dados do piloto

A política server-side fica ativa apenas em staging com `PILOT_MODE=true` e `PILOT_DATA_MODE=SYNTHETIC_ONLY`; modo ausente/desconhecido falha fechado. Production não ativa heurísticas. Patient/Lead e texto clínico exigem marcador central, e-mail nulo ou `example.test`, telefone/CPF nulos e endereço/observação fictícios. Padrões plausíveis são recusados com `PILOT_SYNTHETIC_DATA_REQUIRED`. Contas reais autorizadas de User/Membership não são conteúdo clínico e seguem privacidade/LGPD.

## PR 41 — ensaio assistido

Implementados e testáveis localmente: fechamento fail-closed dos blockers P1, política sintética server-side, seed/perfil externo, workflows protegidos, plano e evidência sanitizada. Não executados: Environment/secrets reais, banco ou migration de staging, seed/deploy/smoke/restore externos, revisão ou treinamento humano, piloto e produção.
