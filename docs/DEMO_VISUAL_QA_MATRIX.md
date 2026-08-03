# Matriz de QA visual da demonstração

**Data:** 2026-08-03
**Escopo:** revisão estática do código, testes automatizados e smoke visual local das rotas `/demo`.
**Legenda:** **R** = revisado no código; **N/A** = não existe nessa rota; **C** = coberto por padrão compartilhado. Esta matriz registra uma baseline técnica, não certificação WCAG nem validação pixel-perfect em dispositivo real.

| Rota | Desktop / tablet / mobile | Teclado | Headings / landmarks | Formulários | Modal / drawer | Tabelas | Vazio / loading / erro | Contraste | Overflow | Problemas encontrados e correções |
|---|---|---|---|---|---|---|---|---|---|---|
| `/demo/dashboard` | R / R / R | R | R / C | R | R / C | R | R / R / R | R | controlado | Gráficos já tinham resumo textual; preservados KPIs adaptáveis, tabela rolável e estados simuláveis. Diálogo permanece candidato à migração ao padrão compartilhado. |
| `/demo/agenda` | R / R / R | R | R / C | R | R / C | R | R / C / C | R | controlado | Grades Dia/Semana mantêm scroll contido e Lista preserva dados essenciais; conflitos têm texto. Formulário possui validação local; diálogo legado ainda requer auditoria manual com leitor de tela. |
| `/demo/crm` | R / R / R | R | R / C | R | R / C | N/A | R / C / C | R | controlado | Kanban mantém alternativa de mudança de etapa por controle, sem depender de drag-and-drop. Drawer legado identificado para migração incremental. |
| `/demo/pacientes` | R / R / R | R | R / C | R | R / C | R | R / C / C | R | controlado | Tabela desktop e cards preservados no mobile. Fluxo em etapas e labels revisados. |
| `/demo/pacientes/[id]` | R / R / R | R | R / C | R | N/A / C | N/A | novo not-found / C / C | R | abas contidas | Corrigido fallback silencioso para o primeiro paciente: ID inexistente agora mostra recuperação explícita no shell. Abas continuam com scroll horizontal. |
| `/demo/orcamentos` | R / R / R | R | R / C | R | R / C | R | R / C / C | R | controlado | Cards mobile preservam informação financeira essencial; wizard revisado. |
| `/demo/orcamentos/[id]` | R / R / R | R | R / C | R | N/A / C | R | novo not-found / C / C | R | controlado | Corrigidos fallback silencioso e landmark `main` aninhado. Tabelas financeiras mantêm scroll contido e seleção nomeada. |
| `/demo/inbox` | R / R / R | R | R / C | R | N/A / C | N/A | R / C / C | R | painéis contidos | Fluxo lista/conversa/contato e compositor mobile revisados; indicadores mantêm rótulos textuais. Teste em teclado virtual real permanece pendente. |
| `/demo/relatorios` | R / R / R | R | R / C | R | N/A / C | R | R / C / C | R | controlado | Resumos textuais e legendas revisados; séries não são descritas apenas pela cor. |
| `/demo/configuracoes` | R / R / R | R | R / C | R | N/A / C | R | R / C / C | R | controlado | Doze seções revisadas; seletor mobile, feedback local e estados “Em breve” preservados. |
| `/demo/configuracoes/[section]` | R / R / R | R | R / C | R | N/A / C | R | not-found / C / C | R | controlado | Slug inválido continua usando tratamento seguro. Toggles/checkboxes possuem nomes acessíveis. |
| `/demo/admin` | R / R / R | R | R / C | R | N/A / C | R | R / C / C | R | controlado | Distinção visual da administração e dados sanitizados preservados. Ações icon-only existentes foram revisadas; confirmação nativa segue como dívida de UX. |
| `/demo/*` inexistente | R / R / R | R | R / C | N/A | N/A / C | N/A | novo estado / C / C | R | sem overflow | Criada rota de recuperação que mantém o shell, explica o estado e oferece retorno ao dashboard. |

## Achados transversais

- **Duplicação:** tabelas e superfícies ainda têm implementações locais, mas a remoção em massa teria risco desproporcional. `DataTable` foi endurecida como implementação canônica para novas migrações.
- **Foco:** o drawer mobile duplicava lógica de trap, Escape, scroll lock e devolução. A lógica foi centralizada em `AccessibleDialog` e coberta por teste.
- **Semântica:** foi removido um `main` aninhado no detalhe de orçamento; tabelas compartilhadas agora usam `caption`, `scope="col"` e região rolável focalizável.
- **Responsividade:** `main` e shell têm `min-width: 0`; o documento bloqueia overflow horizontal acidental sem retirar o scroll explícito de tabelas/grades; áreas roláveis usam overscroll contido.
- **Alvos de toque:** controles em dispositivos de ponteiro coarse recebem baseline mínima de 44 px.
- **Estados:** loading, erro, vazio, sucesso, offline e permissão permanecem compartilhados; foi acrescentado estado para rota/registro inexistente.

## Validação manual ainda necessária

Revisão visual em 320, 375, 390, 768, 1024, 1280, 1440 e 1920 px foi orientada pela estrutura responsiva e por smoke local; homologação em dispositivos físicos, zoom 200/400%, leitores de tela (NVDA/JAWS/VoiceOver), contraste instrumental e teclado virtual permanece necessária. Nenhuma área é declarada formalmente conforme WCAG somente por esta matriz.
