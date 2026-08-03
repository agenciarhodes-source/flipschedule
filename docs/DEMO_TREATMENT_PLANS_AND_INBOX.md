# Orçamentos e Inbox demonstrativos

## Escopo e critérios de aceite

Esta entrega aprofunda exclusivamente `/demo/orcamentos`, `/demo/orcamentos/[id]` e `/demo/inbox`. A experiência é aceita quando listagem, filtros, criação guiada, detalhes, aceite, conversas e operação da fila funcionam em memória, sem banco, autenticação, secrets, rede ou provedor externo.

## Arquitetura e componentes

- `domains/demo/treatment-plans.ts` define contratos, catálogo com 15 procedimentos, 25 planos fictícios e regras puras financeiras, filtros, ordenação, transições, duplicação e aceite parcial.
- `components/modules/treatment-plans/plans-view.tsx` concentra a coordenação da listagem, filtros, KPIs, paginação, cards e criação guiada; `plan-detail-view.tsx` apresenta itens, parcelas, timeline, relações e ações locais.
- `domains/demo/conversations.ts` define contratos, tags, oito respostas rápidas, 30 conversas em sete canais e operações puras de fila, SLA e mensagens.
- `components/modules/inbox/inbox-view.tsx` implementa lista, thread, compositor, notas e painel do contato em três áreas responsivas.

As páginas apenas compõem os componentes. O estado efêmero pertence às views e é restaurado ao recarregar. Arrays extensos ficam nos domínios, não nas rotas.

## Cálculos financeiros

Dinheiro é representado em centavos inteiros. Subtotal é a soma de quantidade vezes valor unitário; descontos de item são deduzidos antes do desconto geral; total, entrada e saldo nunca ficam negativos. Parcelas usam divisão inteira e distribuem o resto de um centavo entre as primeiras parcelas, garantindo que a soma seja exatamente o saldo. Datas de parcela usam datas civis ISO e intervalo explícito. Margem é apenas indicador fictício e não representa contabilidade.

No aceite parcial, somente itens pendentes selecionados mudam para aceitos. O valor aceito é recalculado pelos totais desses itens, o restante permanece pendente e um evento é anexado à timeline. Selecionar novamente um item aceito não duplica seu valor. Quando todos os itens são aceitos, o plano passa a `Aceito`.

## Status, timeline e relações

As transições permitidas são declaradas no domínio e ações inválidas mantêm o plano intacto. Criação, duplicação, mudança de status e aceite geram eventos fictícios. Planos relacionam IDs estáveis de paciente, lead e agendamento; a interface oferece navegação para Pacientes, CRM e Agenda. O link compartilhável exibido é explicitamente demonstrativo: não contém token, não cria endpoint e não é armazenado.

## Inbox, mensagens, notas e SLA

WhatsApp, Instagram, Messenger, Site, E-mail, Telefone e Interno são rótulos de fixtures, não integrações. Texto, imagem, documento, áudio e localização são representações visuais sem arquivos. Enviar adiciona imediatamente uma mensagem local e atualiza status; notas internas usam direção, rótulo e superfície distintos, podem ser fixadas ou removidas e nunca simulam envio ao paciente.

SLA compara o instante determinístico da demonstração com a última mensagem; urgentes têm janela menor. Atraso, espera e prioridade sempre possuem texto ou ícone além da cor. Responsável, transferência, prioridade, status, resolução, reabertura, arquivamento e tags produzem mudanças somente locais. Conversas relacionam paciente ou lead, orçamento e agenda.

## Estados, acessibilidade e responsividade

Busca sem resultados usa estado vazio compartilhado; validações e sucessos usam `role=alert`/`role=status`; ações indisponíveis são descritas textualmente. Tabelas possuem nomes acessíveis, mensagens formam lista semântica e controles têm labels. Em telas pequenas, Orçamentos usa cards e o criador ocupa a viewport; a Inbox navega entre lista, conversa e contato com retorno explícito. Desktop usa três áreas.

## Limitações e evolução futura

Não há persistência, concorrência multiusuário, RBAC do módulo, geração pública segura, PDF real, pagamentos, envio, upload, realtime, webhooks ou integrações. Não há `fetch`, Prisma ou Better Auth nesses módulos. Uma implementação futura deverá manter as funções de domínio, adicionar contratos Zod nos limites, serviços server-side tenant-scoped, autorização por recurso, transações, trilha auditável e adapters idempotentes. Tokens públicos reais deverão ser opacos, revogáveis e protegidos; canais deverão verificar assinatura, replay, consentimento e retenção antes de qualquer efeito.
