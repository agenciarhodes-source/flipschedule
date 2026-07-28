# FlipSchedule — PRD

## Problem statement (original)
> Construa FlipSchedule, um SaaS multi-tenant para clínicas odontológicas e clínicas médicas em geral.

Reference artifacts: two prompt-master documents (Neon/Next.js and Lovable/Supabase versions) were supplied. Since this environment is React + FastAPI + MongoDB, we adapted the architecture while preserving the product spec, business rules and design system verbatim (dark, financial-terminal aesthetic with Instrument Serif + IBM Plex, mint #95E4A5 on #12181E).

## User personas
- **Recepcionista** — atende WhatsApp, marca consulta, envia orçamento (uso 90% do dia).
- **Dono(a) / Gestor(a)** — vê dashboard, ROI, ocupação de agenda.
- **Profissional (dentista)** — vê própria agenda, plano de tratamento.
- **Time FlipSchedule (cross-tenant, futuro)** — opera múltiplas clínicas.

## Core requirements (static)
- Multi-tenant por `slug` (URL `/[slug]/...`).
- pt-BR único, timezone `America/Sao_Paulo`, valores em centavos, telefones em E.164.
- Dark mode by default, estética "financial terminal", fontes editorial + mono.
- Base LGPD: consentimento no cadastro de paciente e no aceite público de orçamento.

## What's implemented — 2026-02

### Backend (`/app/backend/server.py`)
- CRUD tenants; auto-seed no startup se collection vazia.
- Professionals, Resources, Procedures — full CRUD.
- Patients — list/search, create com dedupe por telefone, get com histórico.
- Leads — list com patient info, create, update (com timestamps automáticos por estágio).
- Appointments — list com filtro `start/end`, create com validação de conflito (409), update com re-check de conflito, delete.
- TreatmentPlans — list, create com cálculo automático `total_cents`/`final_cents`, update; envio gera `public_token` e `expires_at`.
- Public plan endpoints — GET auto-transiciona `sent → viewed`; POST/accept exige LGPD + registra consent; POST/reject.
- Conversations & Messages — list, send com reply patient simulada.
- Dashboard — KPIs, revenue_series 6 meses, top procedimentos, funnel, alerts.
- Seed idempotente (`POST /api/seed`) — 1 tenant, 4 profissionais, 15 procedimentos odonto, 15 pacientes, 15 leads, ~24 appointments, 8 planos.

### Frontend (`/app/frontend/src/pages/`)
- **Landing** — hero editorial "Sua clínica não precisa de mais uma agência..."; KPI panel; features grid; sections numbers + footer.
- **Login** — entrada direta na demo (sem auth conforme escolha do usuário).
- **AppShell** — sidebar 240px com nav + tenant switcher + saída; topbar com data + busca.
- **Dashboard** — 7 KPIs (receita hero + 6 métricas), gráfico area 6 meses (recharts), top procedimentos, funil, alertas.
- **Agenda** — grid semanal 7d × 12h com drag&drop nativo, filtros por profissional, cards coloridos por status + borda por profissional, modal criar/editar/status.
- **CRM** — Kanban 6 colunas (New→Lost) com drag&drop, cards com paciente/procedimento/valor/canal.
- **Inbox** — 3 colunas WhatsApp-style: lista conversas, thread com bubbles, painel lateral do paciente. Envio simula resposta do paciente.
- **Orçamentos** — 4 KPIs + tabela status; modal criar plano com itens/desconto/total; "Enviar & copiar link" gera public_token.
- **Pacientes** — tabela com avatar, tags, telefone, origem, LTV; busca live; modal cadastro com LGPD.
- **PacienteDetalhe** — ficha completa com histórico de consultas e orçamentos.
- **Configurações** — Tabs Profissionais / Procedimentos / Cadeiras / Régua (UI-only).
- **PublicPlan** — página pública mobile-first para aceite; validação CPF (módulo 11), telefone E.164, checkbox LGPD.

### Design system
- CSS variables (dark palette), Instrument Serif + IBM Plex Sans + IBM Plex Mono via Google Fonts.
- Tailwind extendido: cores `bg`, `bg-alt`, `ink`, `line`, `accent` etc.
- Components: shadcn/ui (Dialog, Select, Tabs, Input, Label, Button, Badge) + sonner para toasts + recharts para gráficos.

### Testing
- Backend testing agent — 27/27 (100%). Suite persistida em `/app/backend/tests/test_flipschedule_api.py`.

## Backlog & next actions (P0/P1/P2)

### P0 — próximo sprint
- Autenticação real (magic-link ou JWT com email/senha) e RBAC (owner/manager/receptionist/professional).
- Realtime multi-usuário (Pusher/WebSocket) na agenda e inbox — hoje só polling.
- Régua de comunicação com jobs assíncronos (mesmo mockados via APScheduler).

### P1 — expansão
- Integração real WhatsApp Business Cloud API (webhook + envio + templates).
- Meta Ads + Google Ads sync + Conversions API para atribuição de ROI.
- PDF do orçamento gerado server-side.
- Prontuário eletrônico com odontograma clicável (notação FDI).
- Multi-clínica dentro do mesmo tenant.

### P2 — nice-to-have
- Agente IA (Claude/GPT) no WhatsApp para triagem inicial.
- Instagram DM na inbox unificada.
- Portal LGPD público (`/lgpd/[tenant]`).
- Módulo de peças criativas com checklist CFO/CRO.
- Split de `server.py` em routers por domínio.

## Known deviations from prompt master
- **Stack:** React + FastAPI + MongoDB (o ambiente atual) em vez de Next.js + Neon/Prisma ou React + Supabase. Semântica de RLS/GUC não se aplica; multi-tenancy é enforçado por filtragem explícita por `tenant_id` no server.
- **Auth:** desligado nesta fase, conforme escolha explícita do usuário ("não vamos fazer isso agora").
- **Realtime:** polling em vez de Pusher.
- **Storage:** não há upload de mídia nesta fase (Vercel Blob equivalente ficará para quando WhatsApp real for integrado).

## Files created
- Backend: `server.py` (1109 linhas — modelos, endpoints, seed).
- Frontend: 11 pages, AppShell, lib/api.js, lib/format.js, lib/utils.js, constants/testIds.js, index.css redesenhado, tailwind.config.js estendido, App.js reescrito.
