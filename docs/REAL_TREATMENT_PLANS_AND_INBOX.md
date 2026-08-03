# Orçamentos e Inbox reais

## Escopo implementado

A aplicação autenticada usa `ApplicationContext` para listar, detalhar e alterar planos de tratamento e conversas sempre com `tenantId` derivado da sessão. Cálculos de itens, subtotal, desconto e total ocorrem no serviço server-side e usam centavos inteiros. Criação, edição de rascunho, duplicação, transições, link público, visualização e resposta pública mantêm histórico de status. Conversas oferecem vínculo a paciente/lead, notas internas, marcação de leitura, transição e fila `PENDING` para saída externa.

O link público armazena somente SHA-256 do token aleatório. A página pública seleciona o mínimo necessário, apresenta somente o primeiro nome do paciente e nunca expõe token persistido, CPF, contato, ciphertext, metadata ou configuração de integração.

## Autorização intermediária

OWNER, MANAGER e RECEPTIONIST operam o escopo do próprio tenant. PROFESSIONAL só lê e altera orçamento associado ao `Professional.membershipId` correspondente. Na Inbox, PROFESSIONAL só acessa conversas de pacientes com agendamento relacionado ao seu vínculo e registra somente nota interna. Papéis de agência são negados. Nenhum vínculo é inferido por nome ou e-mail.

## Honestidade de integração e limitações

Uma mensagem externa só pode ser criada quando a conversa possui integração `CONNECTED`; ela permanece `PENDING`. Este PR não envia mensagem, não implementa webhook nem worker e não declara entrega. Como ainda não há serviço criptográfico oficial para conteúdo de mensagem, somente a prévia redigida de até 160 caracteres é persistida; ciphertext permanece nulo. Não há pesquisa em ciphertext.

Parcelamento, cobrança, pagamento, aceite parcial, status por item, prioridade, responsável e tags persistentes não existem no schema e aparecem como **Ainda não disponível** na aplicação real. Nenhuma coluna, tabela, enum, migration ou atalho JSON foi criado.

## Critérios de aceite e validação

- toda consulta interna contém o tenant confiável e limites de paginação;
- detalhes e mutações cross-tenant resultam em ausência/negação;
- relações referenciadas são verificadas no mesmo tenant;
- escrita composta, histórico e auditoria usam transação;
- datas são serializadas em ISO e valores financeiros permanecem inteiros;
- o modo `/demo` e seus dados locais permanecem inalterados.
