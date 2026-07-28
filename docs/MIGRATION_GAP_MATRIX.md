# Matriz de lacunas para a arquitetura definitiva — FlipSchedule

Este documento compara estados; não autoriza nem executa migração.

| Área | Arquitetura atual | Arquitetura definitiva | Lacuna | Risco | Estratégia recomendada | Fase futura responsável |
|---|---|---|---|---|---|---|
| Framework web | CRA/CRACO SPA | Next.js App Router | Renderização, routing, boundaries e deploy diferentes | Alto | Novo shell; portar tela a tela sem alterar baseline | Fase 1 — fundação web |
| Linguagem | JavaScript/JSX | TypeScript | Contratos e nullability implícitos | Médio | Definir tipos de domínio/API antes do porte | Fase 1 |
| Routing | BrowserRouter, slug livre | App Router protegido | Sem layouts/guards server-side | Crítico | Resolver sessão e tenant no servidor | Fases 1–2 |
| UI | Tailwind/Radix/shadcn-like | Next.js + Tailwind | Client components e compatibilidade a revisar | Médio | Preservar tokens/primitives após inventário e a11y | Fase 1 |
| Acesso à API | Axios com `REACT_APP_*` | Server Actions/Route Handlers ou API tipada | Config pública e chamadas sem identidade | Alto | Criar camada tipada e política de cache/erros | Fase 2 |
| Backend | FastAPI monolítico | Next.js na referência (destino a detalhar) | Duplicação/transição de domínio | Alto | Manter FastAPI durante transição; decidir strangler/retirada em ADR | Fase 0/1 arquitetura |
| Persistência | MongoDB/Motor | Prisma/PostgreSQL Neon | Modelo documental versus relacional | Crítico | Modelar domínio, constraints e plano ETL validado | Fase 3 — dados |
| Evolução de schema | Nenhuma migration | Prisma migrations | Sem histórico/reprodutibilidade | Crítico | Baseline, migrations revisadas e rollback | Fase 3 |
| Hosting | Ambiente Emergent | Vercel | Build/runtime/env/observabilidade divergentes | Alto | Ambientes separados e preview após fundação | Fase 4 — plataforma |
| Autenticação | Login demo | Autenticação real | Não há identidade, sessão ou recovery | Crítico | Escolher provedor e threat model; sessões seguras | Fase 2 — identidade |
| Autorização | Nenhuma | RBAC | Toda operação é pública | Crítico | Matriz papel×ação e enforcement server-side | Fase 2 |
| Multi-tenancy | Slug → tenant; filtros manuais | Isolamento seguro | IDOR e risco de filtro omitido | Crítico | Tenant derivado da sessão; constraints/policies e testes negativos | Fases 2–3 |
| Multi-clínica | Um modelo/seed, sem operações | Clínicas isoladas por tenant | Unidade não integra domínio | Alto | Definir hierarquia tenant–clínica–usuário–recurso | Fase 3 |
| Validação | Pydantic permissivo, strings | Schemas tipados/constraints | Status/datas/relações frágeis | Alto | Enums, Zod/server validation e FKs/checks | Fases 2–3 |
| Agenda | Conflito só por profissional | Agenda consistente | Sem recurso, expediente e concorrência | Alto | Especificar invariantes; transação/lock e timezone | Fase 5 — agenda |
| CRM | Kanban básico | CRM seguro/auditável | Sem ownership/histórico/automação | Médio | Event/history model e permissões | Fase 6 — CRM |
| Orçamentos | Token público e totais simples | Proposta segura + cobrança | PII exposta; expiração/idempotência ausentes | Crítico | Token hash/TTL, versões, assinatura e eventos | Fase 6 |
| Asaas | Ausente | Integração Asaas | Sem cliente, cobrança ou webhook | Alto | Adapter, idempotência, assinatura e reconciliação sandbox | Fase 7 — pagamentos |
| Meta | Canais simulados | Meta Cloud API oficial | Sem OAuth/webhooks/templates | Alto | App oficial, webhook verificado, opt-in e adapter | Fase 7 — canais |
| Realtime/jobs | Resposta imediata simulada | Eventos/realtime confiáveis | Sem fila, retry, ordering | Alto | Outbox/queue e SSE/WebSocket conforme necessidade | Fase 7 |
| LGPD | Consentimento parcial | Programa LGPD | Sem direitos, retenção e base legal | Crítico | Data map, DPIA, policies, workflows e minimização | Fase 2 transversal |
| Auditoria | Logs básicos | Audit trail imutável | Sem atribuição de ações | Alto | Eventos com ator/tenant/ação, proteção de PII | Fase 2 transversal |
| Observabilidade | Logging básico | Logs, métricas, traces, alertas | Diagnóstico insuficiente | Médio | Correlação, redaction, SLO e alertas | Fase 4 |
| Testes | Integração HTTP externa; nenhum frontend | Pirâmide automatizada/CI | Baseline incompleto e dependente de serviços | Alto | Unit/contract/E2E, fixtures isoladas e CI | Todas as fases |
| Supply chain | Sem lockfile; installs remotos | Builds reproduzíveis | Dependências não determinísticas | Alto | Lockfiles, scans, atualização controlada e SBOM | Fase 1/4 |
| Emergent | Scripts, pacote e HTML acoplados | Infra própria | Dependência de fornecedor/protótipo | Médio | Catalogar e retirar somente após equivalência | Fase 4 |

## Sequência recomendada

1. Preservar/taguear o protótipo e aprovar ADRs de arquitetura, identidade e tenancy.
2. Construir fundação Next.js/TypeScript e controles de autenticação/RBAC, sem conectar dados reais.
3. Projetar Prisma/PostgreSQL, constraints e estratégia de migração/validação; só então provisionar Neon.
4. Criar plataforma Vercel, CI, secrets e observabilidade.
5. Portar módulos por fatias verificáveis, começando pelos contratos centrais.
6. Implementar agenda/CRM/orçamentos e, posteriormente, Asaas e APIs oficiais Meta com idempotência e auditoria.

Nenhuma dessas ações foi realizada nesta tarefa.
