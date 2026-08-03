# QA visual, responsividade e acessibilidade do modo demonstração

## Escopo e critérios de aceite

Este hardening cobre o application shell e as experiências demonstrativas de Dashboard, Agenda, CRM, Pacientes, Orçamentos, Inbox, Relatórios, Configurações e Administração. O aceite técnico exige rotas sem crash, navegação coerente, conteúdo essencial preservado no mobile, foco previsível no drawer, tabelas com scroll controlado, estados recuperáveis e build sem banco, autenticação ou secrets.

As rotas revisadas são `/demo/dashboard`, `/demo/agenda`, `/demo/crm`, `/demo/pacientes`, `/demo/pacientes/[id]`, `/demo/orcamentos`, `/demo/orcamentos/[id]`, `/demo/inbox`, `/demo/relatorios`, `/demo/configuracoes`, `/demo/configuracoes/[section]` e `/demo/admin`, além da recuperação para caminhos e registros inexistentes. A evidência por rota está em `DEMO_VISUAL_QA_MATRIX.md`.

## Padrões consolidados

- `AccessibleDialog` é a baseline compartilhada para diálogos e drawers: título/descrição associados, `aria-modal`, foco inicial, ciclo de Tab, Escape, bloqueio do scroll de fundo e devolução de foco.
- O drawer mobile usa esse padrão, possui overlay, botão de fechamento nomeado, `aria-controls`, navegação identificada e scroll interno contido.
- `DataTable` fornece caption acessível, cabeçalhos de coluna, região focalizável e instrução acessível para scroll horizontal.
- Tokens existentes de superfície, borda, raio, sombra, foco e tipografia foram preservados. O hardening acrescenta contenção global segura e alvos de toque sem redesenhar a identidade.
- `DemoNotFound` diferencia conteúdo fictício ausente, evita expor infraestrutura e mantém uma ação clara de retorno.

## Responsividade e navegação

O shell continua fluido e limita conteúdo com `min-width: 0`. Tabelas, kanban e grades mantêm scroll horizontal explícito em vez de esconder informação essencial. Em dispositivos de toque, controles interativos recebem dimensão mínima de 44 px. O drawer evita scroll duplo e overscroll para o conteúdo de fundo.

O link “Pular para o conteúdo”, o landmark `main`, as navegações nomeadas, o breadcrumb e `aria-current` permanecem no shell. A rota ativa continua derivada do pathname. A navegação móvel fecha ao selecionar uma rota e devolve foco quando fechada por Escape ou botão.

## Baseline técnica de acessibilidade

O trabalho é inspirado nos requisitos relevantes da WCAG 2.2 AA: foco visível, operação por teclado, nomes/descrições acessíveis, landmarks, headings, status textuais, feedback via live regions já presentes, target size, prevenção de overflow e `prefers-reduced-motion`. Status importantes continuam acompanhados de texto; gráficos preservam descrições/resumos acessíveis.

Isso **não é certificação WCAG** nem afirma conformidade integral. Contraste instrumental, sequência completa de foco, zoom/reflow, leitores de tela e compreensão por pessoas usuárias exigem auditoria independente.

## Performance e qualidade React

O novo comportamento de diálogo concentra um único listener de teclado somente enquanto aberto e restaura o estado do `body` no cleanup. Não foram adicionadas dependências, fetches, imagens, gráficos ou efeitos de dados. Fixtures permanecem fora das views. O detalhe de orçamento não cria mais um landmark `main` dentro do `main` do shell.

## Limitações e próximos testes manuais

- Migrar incrementalmente os modais/drawers locais de Dashboard, Agenda, CRM, Pacientes e Orçamentos ao padrão compartilhado, após testes de regressão por fluxo.
- Substituir confirmações nativas por `ConfirmDialog` comum quando o produto aprovar o texto e severidade de cada ação.
- Validar em dispositivos reais iOS/Android, incluindo teclado virtual da Inbox, safe areas, orientação e zoom.
- Executar auditoria com NVDA, JAWS e VoiceOver e medição instrumental de contraste.
- Executar E2E completo quando um runner estiver declarado como dependência direta/configurado; o lockfile contém referência transitiva a Playwright, mas o projeto não possui ferramenta E2E instalada/configurada para uso.
- Realizar revisão visual humana nos oito viewports-alvo e comparar screenshots de todos os estados interativos; jsdom não comprova layout pixel-perfect.

Nenhuma conexão externa, persistência, autenticação, RBAC, billing, integração ou acesso a production faz parte desta entrega.
