# Política de dados do piloto

A política server-side fica ativa apenas em staging com `PILOT_MODE=true` e `PILOT_DATA_MODE=SYNTHETIC_ONLY`; modo ausente/desconhecido falha fechado. Production não ativa heurísticas. Patient/Lead e texto clínico exigem marcador central, e-mail nulo ou `example.test`, telefone/CPF nulos e endereço/observação fictícios. Padrões plausíveis são recusados com `PILOT_SYNTHETIC_DATA_REQUIRED`. Contas reais autorizadas de User/Membership não são conteúdo clínico e seguem privacidade/LGPD.
