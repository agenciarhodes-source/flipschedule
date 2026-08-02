# Fundação visual da demonstração

## Objetivo e critérios de aceite

Esta entrega cria uma superfície pública, navegável e exclusivamente visual do FlipSchedule. Considera-se aceita quando `/demo` redireciona para o dashboard, as nove rotas renderizam no mesmo shell, navegação desktop/mobile e estados compartilhados são testados, e lint, tipos, testes e build passam sem configuração de autenticação ou banco.

## Rotas

`/demo` redireciona server-side para `/demo/dashboard`. O route group `app/(demo)` mantém o layout público compartilhado nas rotas:

- `/demo/dashboard`;
- `/demo/agenda`;
- `/demo/crm`;
- `/demo/pacientes`;
- `/demo/orcamentos`;
- `/demo/inbox`;
- `/demo/relatorios`;
- `/demo/configuracoes`;
- `/demo/admin`.

## Arquitetura visual

- `components/app-shell`: shell, sidebar recolhível, topbar, drawer mobile e seletor de unidade;
- `components/shared`: headers, métricas, badges, busca, filtros, tabela e estados visuais;
- `components/modules`: telas-base dos módulos, sem regras ou integrações reais;
- `lib/demo/navigation.ts`: fonte única das rotas e metadados de navegação;
- `domains/demo`: tipos e fixtures fictícias isoladas.

O design system permanece centralizado em `app/globals.css` e `tailwind.config.ts`, com superfícies escuras, tipografia Instrument Serif/IBM Plex, accent verde, status semânticos, espaçamento fluido, bordas, raios e sombra discreta.

## Dados simulados

A demonstração representa a Clínica Aurora, com as unidades Centro e Zona Leste e os profissionais Dra. Mariana Costa, Dr. Rafael Lima e Dra. Camila Rocha. Pacientes, leads, conversas, horários e valores são inteiramente fictícios. Valores financeiros continuam representados em centavos nas fixtures.

## Isolamento

O layout e as páginas em `app/(demo)` não importam Better Auth, guards, Prisma, cliente de banco nem variáveis de ambiente. Não há bypass: o layout privado em `app/(platform)` continua chamando `requireAuthenticatedTenantContext`. Interações como busca, filtros, menus e envio na Inbox são visuais ou estado local e não persistem dados.

## Execução

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://localhost:3000/demo`. A validação completa usa `pnpm check`.

## Responsividade e acessibilidade

O shell troca a sidebar fixa por drawer abaixo de `lg`. O drawer tem overlay, diálogo modal, ciclo de foco, Escape e retorno do foco ao gatilho. Tabelas usam regiões com rolagem horizontal contida, grids empilham em viewports estreitas e botões mantêm alvo mínimo. Há link para pular ao conteúdo, headings semânticos, `aria-current`, labels e ícones decorativos ocultos.

## Limitações e próximos módulos

Esta fundação não implementa backend, autorização do módulo, filtros reais, calendário interativo, drag-and-drop, persistência, exportação, integrações, realtime ou métricas reais. Dashboard, Agenda, CRM, Pacientes, Orçamentos, Inbox e Relatórios serão aprofundados em PRs próprios; Configurações e Administração permanecem estruturas visuais. Nenhum módulo é considerado funcionalmente concluído por esta entrega.
