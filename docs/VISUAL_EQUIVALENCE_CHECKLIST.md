# Checklist de equivalência visual — FlipSchedule

Use o protótipo em `frontend/` somente como referência, lado a lado com a aplicação Next.js. Registre viewport, navegador, commit, evidência e divergência para cada item. Uma caixa marcada exige inspeção efetiva; a criação deste checklist não constitui aprovação.

## Landing

- [ ] Header preserva wordmark, densidade, borda e hierarquia de links.
- [ ] Hero preserva largura, escala tipográfica, destaques verdes e ritmo vertical.
- [ ] Painel de métricas mantém grid, divisores, tipografia e contraste.
- [ ] Cards editoriais e rodapé mantêm superfícies, bordas e espaçamento.
- [ ] Textos não alegam funcionalidades ainda inexistentes.

## Sidebar

- [ ] Largura de 240 px, fundo alternativo e borda direita equivalem ao legado.
- [ ] Marca, tenant, ordem dos itens e ação “Sair” preservam a hierarquia.
- [ ] Ícones, item ativo, hover e densidade equivalem ao AppShell.
- [ ] Conteúdo longo rola sem deslocar tenant ou ação de saída.

## Topbar

- [ ] Altura, borda, transparência e indicador verde equivalem ao legado.
- [ ] Data e busca visual mantêm tipografia mono, alinhamento e contraste.
- [ ] Busca está claramente inativa nesta fase e não simula funcionalidade.

## Tipografia

- [ ] Instrument Serif aparece em display e títulos, sem layout shift perceptível.
- [ ] IBM Plex Sans aparece na interface e IBM Plex Mono em labels/dados.
- [ ] Fallbacks, pesos, line-height e tracking se aproximam do protótipo.

## Cards e métricas

- [ ] Background, border, radius e sombra sutil preservam a estética.
- [ ] Métricas usam algarismos tabulares e hierarquia equivalente.
- [ ] Badges e estados usam accent/warning/danger/info com contraste adequado.

## Espaçamento

- [ ] Padding de página, gaps, densidade da navegação e ritmo editorial equivalem.
- [ ] Nenhum conteúdo fica cortado ou encoberto pelo shell.

## Desktop

- [ ] Verificado em 1440 × 900.
- [ ] Sidebar permanece fixa e a região principal rola de forma independente.
- [ ] Todas as sete rotas privadas preservam o mesmo shell.

## Mobile

- [ ] Verificado em 390 × 844.
- [ ] Sidebar não ocupa permanentemente a viewport.
- [ ] Drawer abre/fecha, contém foco, fecha com Escape e restaura o foco.
- [ ] Alvos clicáveis têm área adequada e o conteúdo não produz corte horizontal.

## Estados de foco

- [ ] Links, botões e controles exibem focus visible consistente.
- [ ] `aria-current` identifica a rota ativa.
- [ ] Ícones decorativos não duplicam nomes acessíveis.
- [ ] Navegação por teclado percorre o shell em ordem previsível.

## Rotas a verificar

- [ ] `/`
- [ ] `/clinica-vitalita/dashboard`
- [ ] `/clinica-vitalita/agenda`
- [ ] `/clinica-vitalita/inbox`
- [ ] `/clinica-vitalita/crm`
- [ ] `/clinica-vitalita/orcamentos`
- [ ] `/clinica-vitalita/pacientes`
- [ ] `/clinica-vitalita/configuracoes`

## Evidência da migração estática

- [ ] Dashboard: KPIs, receita, gráfico, procedimentos, funil e alertas comparados lado a lado.
- [ ] Agenda: toolbar, filtros, semana, cards e estados comparados lado a lado.
- [ ] Inbox: lista, thread, painel e composer comparados lado a lado.
- [ ] CRM: colunas, cards, contadores e filtros comparados lado a lado.
- [ ] Orçamentos: KPIs, tabela, valores e status comparados lado a lado.
- [ ] Pacientes: busca, tabela, tags, LTV e vazio comparados lado a lado.
- [ ] Configurações: tabs e conteúdo demonstrativo comparados lado a lado.
- [ ] Plano público: itens, total, aviso de demonstração e estados locais comparados lado a lado.

A implementação está disponível para inspeção, mas os itens permanecem desmarcados porque o servidor não pôde ser iniciado neste ambiente.
