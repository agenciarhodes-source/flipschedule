# Relatórios, Configurações e Administração demonstrativos

## Escopo e critérios de aceite

Esta entrega aprofunda exclusivamente `/demo/relatorios`, as doze subseções de `/demo/configuracoes` e `/demo/admin`. É aceita quando análises, filtros, visões salvas, formulários e ações administrativas operam em memória, em português brasileiro, sem rede, autenticação, Prisma, banco, secrets, billing ou integração externa.

## Arquitetura

- `domains/demo/reports.ts` concentra contratos, séries e cálculos puros para período, comparação, tendência, receita, comparecimento, ocupação, conversão, agrupamento e SLA. Reutiliza agendamentos e profissionais já existentes.
- `domains/demo/settings.ts` define clínica, unidades, profissionais, procedimentos, horários, equipe, notificações, integrações, segurança e cobrança, além de validação e detecção de alterações.
- `domains/demo/administration.ts` contém tenants independentes e fictícios, usuários mascarados, assinaturas, serviços, jobs, suporte e feature flags, com agregações puras.
- As views em `components/modules/{reports,settings,admin}` coordenam somente apresentação e estado React efêmero. As páginas apenas compõem essas views no shell demo existente.

## Páginas e interações

Relatórios possui oito categorias, comparação temporal, filtros combinados e chips, período personalizado, visão salva/removível, exportação simulada, gráficos CSS acessíveis, tabelas de profissionais e comparação selecionável de unidades. Configurações oferece subrotas para Clínica, Unidades, Profissionais, Procedimentos, Horários, Equipe, Notificações, Integrações, Segurança, Plano e cobrança, Personalização e Privacidade. Formulários validam e salvam apenas na memória da tela. Administração separa visão geral, tenants, usuários, assinaturas, saúde, jobs/logs sanitizados, suporte, auditoria e feature flags.

## Dados e relações

A central analítica representa consolidação de Agenda, CRM, Pacientes, Orçamentos e Inbox e reutiliza catálogos de unidade, profissional, procedimento e agendamento. Configurações inicia com Clínica Aurora e seus vínculos existentes. Administração usa tenants cross-plataforma totalmente independentes, e-mails mascarados e erros sanitizados. Todo dinheiro está em centavos nas fixtures.

## Estados e limitações

Feedback, validação, vazio/sem resultados, alteração não salva, controles indisponíveis e alertas de dados fictícios são explícitos. Loading, erro, offline e sem permissão continuam cobertos pelos estados compartilhados do shell. Não existem persistência após recarga, concorrência, exportação PDF/Excel real, convites, e-mail, RBAC administrativo, impersonação, cobrança, 2FA, webhooks, integrações, jobs, logs ou conexão de produção.

## Substituição futura dos mocks

Serviços server-side deverão receber tenant derivado de sessão e Membership ativa, validar entradas com Zod, aplicar autorização por ação/recurso, filtrar cada query por tenant e registrar auditoria sanitizada. Relatórios devem ser agregados no servidor; mutações de configuração exigem persistência transacional; administração cross-tenant exige requisitos, acesso temporário explícito e threat model próprios. Adapters idempotentes deverão substituir cartões simulados somente nas fases autorizadas.
