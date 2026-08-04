# Critérios de início, pausa e encerramento

## Início
Somente após: staging validado; migrations atuais; backup de staging existente; restore isolado verificado; smokes público/autenticado aprovados; `PILOT_DATA_MODE=SYNTHETIC_ONLY`; efeitos externos desabilitados; allowlist somente com tenants aprovados; suporte/contatos/janela/responsáveis definidos; treinamento, clínica e jurídico/LGPD aprovados; nenhuma vulnerabilidade P0/P1 aberta.

## Pausa imediata
Cross-tenant, falha relevante de autenticação, perda/corrupção, dado clínico real, chamada de provider, Message externa, cobrança, secret exposto, sessão comprometida, indisponibilidade prolongada, backup indisponível, restore não verificável, vulnerabilidade crítica ou solicitação da clínica.

O operador deve considerar `READ_ONLY` ou `MAINTENANCE`, desativar `PILOT_MODE` quando necessário, revogar sessões comprometidas, preservar AuditLog/evidências, abrir incidente e comunicar responsáveis. Nunca apague evidências. Este PR não automatiza mudanças externas.
