# Inventário de funcionalidades — FlipSchedule

Legenda: “real” significa código/persistência efetivamente implementados no protótipo, não prontidão para produção; os registros atuais são sintéticos.

| Módulo | Tela existente | Backend existente | Persistência existente | Real ou mock | Autenticação | Situação atual | Reaproveitável | Observações |
|---|---|---|---|---|---|---|---|---|
| Landing | Sim | Lista tenants/seed | Mongo indireto | Demo | Não | Funcional dependente da API | Visual/conteúdo | CTA pode disparar seed destrutivo |
| Login | Sim | Não | Não | Mock | Não | Apenas navegação para slug | Visual parcialmente | Sem credenciais, sessão ou identidade |
| Dashboard | Sim | Sim, agregações | Mongo | Seed | Não | KPIs/gráficos demo | Visual e regras como referência | Consultas carregam milhares de docs em memória |
| Agenda | Sim | CRUD + conflito profissional | Mongo | Seed + CRUD | Não | Semana, drag/drop, status | UX e conceitos | Sem recurso/expediente/timezone robustos |
| CRM | Sim | CRUD parcial de leads | Mongo | Seed + CRUD | Não | Kanban de estágios | UX e funil | Sem automação, ownership seguro ou histórico |
| Inbox | Sim | Conversas/mensagens | Mongo | Mock | Não | Resposta aleatória simulada | UX | Sem provedor, webhook, entrega ou realtime |
| Pacientes | Sim | Criar/listar/buscar/detalhar | Mongo | Seed + CRUD parcial | Não | Cadastro e histórico | UX/campos | Sem editar/apagar/exportar; PII pública |
| Orçamentos | Sim | Criar/listar/atualizar | Mongo | Seed + CRUD | Não | Rascunho, envio e link | UX/cálculos como referência | Sem pagamento, versionamento ou autorização |
| Página pública do orçamento | Sim | Ver/aceitar/rejeitar por token | Mongo | Fluxo real sobre demo | Token de URL apenas | Funcional, insegura para produção | Visual/fluxo | Retorna PII; expiração não é aplicada |
| Configurações | Sim | CRUD parcial | Mongo | Seed + CRUD | Não | Tabs de cadastros | Visual | Não persiste configurações gerais completas |
| Profissionais | Dentro de Configurações | CRUD | Mongo | Seed + CRUD | Não | Básico | Formulários/modelo conceitual | Sem usuário, RBAC ou validação CRO |
| Procedimentos | Dentro de Configurações | CRUD | Mongo | Seed + CRUD | Não | Básico | Formulários/modelo conceitual | Valores em centavos; validação limitada |
| Recursos | Dentro de Configurações | Criar/listar/excluir | Mongo | Seed + CRUD | Não | Básico | Conceito | Conflito de agenda não considera recurso |
| Horários | Campos de profissional/agenda | Campo `working_hours` | Mongo | Seed | Não | Não há gestão completa | Conceito | Sem feriados, bloqueios, timezone ou disponibilidade |
| Multi-clínica | Não | Modelo `Clinic` somente | Mongo | Uma clínica seed | Não | Incompleto | Modelo conceitual | Operações não são clinic-scoped; nenhuma troca de unidade |
| Super Admin | Não | Não | Não | Ausente | Não | Ausente | Não | Listagem pública de tenants não é administração |
| Asaas | Não | Não | Não | Ausente | Não | Fora do protótipo | Não | Sem cobrança, webhook ou conciliação |
| WhatsApp | Inbox rotulada | Simulação | Mongo | Mock | Não | Canal fictício | UX da inbox | Sem Meta Cloud API |
| Instagram | Inbox rotulada | Simulação | Mongo | Mock | Não | Canal fictício | UX da inbox | Sem API/webhooks da Meta |
| Facebook | Inbox rotulada | Simulação | Mongo | Mock | Não | `facebook_messenger` no seed | UX da inbox | Sem API/webhooks da Meta |
| LGPD | Checkbox no paciente/plano | Consentimento mínimo | Mongo | Parcial | Não | Insuficiente | Texto/fluxo como rascunho | Sem governança, revogação, retenção, direitos ou auditoria |
| Auditoria | Não | Não | Não | Ausente | Não | Ausente | Não | Logging operacional básico não é audit trail |
| Relatórios | Dashboard apenas | Agregações do dashboard | Mongo | Seed | Não | Sem relatórios/exportação | Gráficos/KPIs | Sem filtros robustos, exportação ou warehouse |
| Realtime | Não | Não | Não | Ausente | Não | Refetch manual | Não | Sem WebSocket/SSE/filas |

## Cobertura transversal

- **Endpoints:** 37 operações REST sob `/api`, todas públicas.
- **Testes:** 27 testes de integração backend; zero suites frontend encontradas.
- **Persistência:** coleções Mongo sem schema/index/migration versionados.
- **Tenancy:** filtro lógico por `tenant_id`, escolhido a partir de slug público.
- **Dados:** a maioria das telas usa dados persistidos, mas originados do seed sintético; canais e respostas da Inbox são explicitamente simulados.
