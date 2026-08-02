# Dashboard e Agenda demonstrativos

## Escopo e critérios de aceite

Esta entrega aprofunda exclusivamente `/demo/dashboard` e `/demo/agenda`, preservando o shell visual existente. A experiência é aceita quando indicadores, gráficos, agenda operacional, filtros e fluxos locais de criar, consultar, alterar, cancelar e reagendar funcionam sem secrets, autenticação, banco, Prisma ou rede.

## Organização

- `domains/demo/appointments.ts` define tipos, profissionais, unidades, procedimentos, bloqueios e 30 agendamentos totalmente fictícios da Clínica Aurora.
- `domains/demo/schedule.ts` concentra filtros e cálculos puros de duração, conflito, ocupação, comparecimento, receita, agrupamentos e comparação.
- `domains/demo/dashboard.ts` define períodos, métricas, alertas, série financeira, funil e atividades.
- Os componentes em `components/modules/dashboard` e `components/modules/agenda` cuidam da apresentação e do estado efêmero.

## Dashboard

O cabeçalho permite trocar período e unidade, atualizar visualmente, exportar de forma simulada e iniciar agendamento. Oito KPIs, evolução realizada versus prevista, agenda do dia, funil, desempenho profissional, ocupação, alertas dispensáveis, atividades e atalhos compõem a visão executiva. Controles explícitos demonstram loading, vazio, erro e sucesso sem requisições.

## Agenda e interações

Dia, Semana e Lista compartilham busca e filtros por unidade, profissional, status, procedimento, recurso, confirmação e período. A grade diária usa intervalos de 30 minutos, posicionamento por horário/duração e bloqueios; semana usa colunas com ocupação; lista usa tabela semântica.

O painel de criação valida campos, mostra resumo e detecta profissional/recurso sobreposto, bloqueio e extrapolação do expediente. Um conflito exige confirmação visual explícita. O detalhe permite confirmar, marcar chegada, iniciar, finalizar, cancelar, marcar falta, editar observação e reagendar. Alterações são imutáveis e locais, desaparecendo ao recarregar.

## Limitações e evolução futura

Não há drag-and-drop, persistência, realtime, envio de confirmação, exportação real nem autorização de módulo. Datas usam setembro de 2026 e UTC para tornar a demonstração determinística; a implementação real deverá usar o timezone IANA do tenant. Para substituir mocks, a UI deverá consumir contratos validados com Zod e serviços server-side tenant-scoped; conflito e concorrência deverão ser garantidos transacionalmente.
