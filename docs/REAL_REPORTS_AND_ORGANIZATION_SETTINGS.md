# Relatórios e configurações reais

## Escopo e critérios de aceite

As rotas autenticadas agora calculam indicadores de Agenda, pacientes, CRM, orçamentos e Inbox diretamente no PostgreSQL, sempre com o `tenantId` do `ApplicationContext`. O período é limitado a 366 dias, o período anterior tem a mesma duração e comparações por unidade e profissional usam somente agregações. A exportação CSV contém nomes institucionais e métricas agregadas; não contém IDs, CPF, telefone, e-mail, mensagens ou evidências de consentimento.

Configurações exibem a organização, cadastros operacionais existentes, integrações persistidas, assinatura persistida e contagens agregadas de consentimentos. Apenas `OWNER` e `MANAGER` podem alterar nome, timezone IANA e locale; a escrita é validada, tenant-scoped e auditada. Integrações e assinatura são somente leitura e nenhum estado externo é inferido.

## Correção herdada do link público

O token bruto do orçamento deixou o path e passou a existir apenas no fragmento (`/plano#token=...`), que não é enviado em requisições HTTP. O cliente remove o fragmento do histórico antes de trocar o token por uma visão minimizada através de Server Action. O banco continua armazenando apenas SHA-256, com expiração.

## Limites operacionais

Receita realizada significa soma dos preços de agendamentos `ATTENDED`; não representa pagamento confirmado. Valor aceito significa orçamento aceito; não representa cobrança. Este trabalho não configurou provedor, billing, Neon, Vercel, analytics ou monitoramento e não executou migration. O modo `/demo` continua usando exclusivamente suas fixtures.
