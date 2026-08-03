# CRM e Pacientes demonstrativos

## Escopo e critérios de aceite

Esta entrega aprofunda exclusivamente `/demo/crm`, `/demo/pacientes` e `/demo/pacientes/[id]`. As experiências são aceitas quando pesquisa, filtros, visualizações, criação e alterações locais funcionam sem autenticação, banco, Prisma, secrets ou rede, preservando o shell e os tokens existentes.

## Arquitetura e dados

- `domains/demo/leads.ts`: tipos, 40 leads sintéticos e funções puras de filtro, agrupamento, valor, conversão, atraso e duplicidade.
- `domains/demo/patients.ts`: tipos, 32 pacientes sintéticos e funções de filtro, ordenação, idade, ticket, frequência, retorno, duplicidade e conversão.
- `components/modules/crm/crm-view.tsx`: estado efêmero do pipeline, lista, detalhes, timeline e criação.
- `components/modules/patients/patients-view.tsx`: filtros, paginação, seleção, criação guiada e feedback.
- `components/modules/patients/patient-profile-view.tsx`: perfil, oito abas, edição, timeline, consentimentos e notas.

As fixtures representam exclusivamente a Clínica Aurora, Centro, Zona Leste e os profissionais da demonstração. Telefones, e-mails, CPFs mascarados, eventos, agendamentos e orçamentos são sintéticos. Dinheiro permanece em centavos.

## Pipeline, conversão e relações

O pipeline possui oito etapas. Uma mudança registra evento, recalcula indicadores e pode ser desfeita. Perda exige motivo e fechamento exige valor. `convertLeadToPatient` cria a relação local e um evento de origem; não grava dados. Links conectam visualmente CRM, perfil, Agenda e orçamento resumido.

## Perfil do paciente

O perfil reúne resumo, dados pessoais, endereço, indicadores, timeline, agendamentos, orçamentos resumidos, financeiro demonstrativo, documentos vazios, consentimentos revogáveis localmente e notas. Edição, arquivamento, restauração e notas só alteram memória do componente.

## Estados, acessibilidade e responsividade

Busca sem resultado, validação, conflito de duplicidade e sucesso têm mensagens explícitas. Tabelas são semânticas, abas usam ARIA, diálogos têm nome, feedback usa `aria-live`, e status combinam texto com cor. Kanban, tabelas, abas e drawers têm overflow controlado. Estados compartilhados de loading, erro, offline e sem permissão continuam disponíveis.

## Limitações e substituição futura

Não existem persistência, concorrência, autorização de módulo, mensagens, cobrança, orçamento completo, integração externa ou sincronização após recarregar. Para substituir mocks, serviços server-side tenant-scoped deverão expor contratos Zod, derivar tenant da sessão e Membership ativa, aplicar RBAC e persistir histórico auditável. Transições, duplicidade e relações deverão ser garantidas transacionalmente.
