# Auditoria do estado atual — FlipSchedule

**Data da auditoria:** 2026-07-28
**Escopo:** diagnóstico, preservação e documentação do protótipo; nenhuma migração ou mudança funcional.

## Baseline de preservação

Antes de qualquer alteração foi executado `git status --short --branch`: a branch era `work` e a árvore estava limpa (`## work`). O commit original é `c80479882a4a7e27de0c2c746ab87b7c508ea781` (`git rev-parse HEAD`). A auditoria passou então para `chore/phase-0-current-state-audit`. Nenhum arquivo preexistente foi removido ou modificado; somente os quatro documentos em `docs/` foram adicionados.

Recomenda-se, após aprovação e no ponto original preservado, criar a tag `emergent-prototype-v1` e a branch `archive/emergent-prototype`, sem force-push nem reescrita de histórico.

## Resumo executivo

O repositório é um monorepo simples: SPA React/JavaScript construída com CRA + CRACO, API FastAPI assíncrona e MongoDB via Motor. O protótipo cobre visualmente landing, login demo, dashboard, agenda, inbox simulada, CRM, pacientes, orçamentos e configurações. A UI consome a API REST; o backend auto-popula uma clínica odontológica fictícia quando o banco está vazio.

É uma demonstração funcional, não uma base pronta para produção. Não há identidade, sessão, autenticação, autorização ou RBAC. Todo endpoint administrativo é público, inclusive `POST /api/seed`, que apaga e recria o tenant demo. Conhecer ou trocar o slug permite ler e alterar dados de qualquer tenant. Há dados pessoais simulados e aceite LGPD mínimo, mas não há governança LGPD, trilha de auditoria ou controles de retenção. As integrações de canais são apenas rótulos e respostas simuladas.

## Estrutura e stack encontradas

| Área | Estado |
|---|---|
| `frontend/` | React 19, React DOM, React Router, JavaScript/JSX, CRA (`react-scripts`), CRACO, Tailwind 3, Axios, Recharts, Sonner, Lucide, componentes Radix/shadcn-like |
| `backend/` | Python, FastAPI, Pydantic, Motor/PyMongo, Uvicorn; implementação monolítica em `server.py` |
| Persistência | MongoDB definido por `MONGO_URL` e `DB_NAME`; sem migrations, schema ou índices versionados |
| Testes | 27 testes de integração HTTP do backend; nenhum teste de frontend encontrado |
| Emergent | `.emergent/`, pacote de visual edits, script e metadados em `public/index.html`, configuração CRACO, relatórios gerados |
| Documentação histórica | `README.md`, `memory/PRD.md`, `test_result.md`, `test_reports/` |

Não há lockfile versionado, Dockerfile, configuração de CI, infraestrutura Vercel, Prisma, PostgreSQL, TypeScript ou Next.js.

## Fluxo atual

1. `/` lista tenants; o CTA chama o endpoint público de seed se não houver tenant.
2. `/login` não valida credenciais: o botão cria/carrega a demo, exibe um toast e navega para `/:slug/dashboard`.
3. `AppShell` resolve o tenant pelo slug e libera diretamente todas as telas internas.
4. As páginas usam `tApi(slug)` e `REACT_APP_BACKEND_URL`; não enviam cookie nem token.
5. FastAPI resolve o slug em MongoDB e filtra a maior parte das coleções por `tenant_id`.
6. `/plano/:token` expõe proposta, paciente e profissional via token; aceite registra status e evidência parcial de consentimento.

## Frontend

### Rotas e páginas

Rotas públicas: landing (`/`), login demo (`/login`) e orçamento (`/plano/:token`). Sob `/:slug`: dashboard, agenda, inbox, CRM, orçamentos, pacientes, detalhe do paciente e configurações. Wildcards redirecionam para a landing. Não existe route guard.

### Componentes e biblioteca visual

`AppShell.jsx` contém navegação e layout. `components/ui/` tem 48 primitives JSX no estilo shadcn/ui sobre Radix; `index.css`, `App.css`, Tailwind tokens, fontes e utilitários formam o design system atual. Recharts atende gráficos; Sonner, Lucide, date-fns e helpers de formatação apoiam UX.

### API, dados e ambiente

`src/lib/api.js` centraliza Axios e concatena `REACT_APP_BACKEND_URL` com `/api`. Essa é a única variável de runtime usada pelo código da aplicação. Nenhum `.env` está versionado; os padrões de `.gitignore` cobrem `.env*`. Sem a variável, a URL vira `undefined/api`. Dados de tela são obtidos da API, porém a API os gera como demonstração; Inbox injeta uma resposta aleatória simulada.

### Build e testes

Scripts: `craco start`, `craco build`, `craco test`. O CRACO adiciona alias `@`, compatibilidade de dev server, health-check opcional e visual edits da Emergent em desenvolvimento. Não foram encontrados `*.test.*` ou `*.spec.*`. A instalação/build/test não puderam começar porque Corepack tentou baixar Yarn 1.22.22 e o proxy devolveu HTTP 403. Não se conclui, portanto, que o código compile.

### Reaproveitamento

Reaproveitáveis como referência/portabilidade seletiva: linguagem visual e tokens CSS; primitives UI compatíveis com React; ícones; textos; regras de apresentação; formatadores; mapa de navegação; fluxos de agenda, kanban, orçamento e inbox; IDs de teste. Devem receber validação de acessibilidade e adaptação para componentes server/client do Next.js.

Devem ser substituídos: bootstrap CRA/CRACO; `App.js`/BrowserRouter; cliente Axios baseado em `REACT_APP_*`; login demo; modelo de proteção por slug; scripts/overlays Emergent; páginas JavaScript deverão ser migradas para TypeScript e integração segura. Não é recomendável copiar cegamente estado e acesso a dados client-side.

## Backend e banco

`server.py` (1.108 linhas) agrega configuração, modelos Pydantic, regras, rotas, analytics e seed. Existem modelos para tenant, clínica, profissional, recurso, procedimento, paciente, lead, agendamento, item/plano de tratamento, conversa e mensagem. Há CRUD parcial e dashboard agregado.

### Regras e validações observadas

- Conflito de agenda verifica sobreposição do mesmo profissional e ignora cancelado/no-show; não valida recurso, expediente, timezone, duração positiva ou referências pertencentes ao tenant.
- Paciente é deduplicado somente por telefone no tenant.
- CRM mantém estágios e timestamps, mas aceita strings sem enum robusto.
- Orçamento calcula quantidade × preço menos desconto, gera token ao enviar e permite visualizar/aceitar/rejeitar publicamente; faltam expiração efetiva, assinatura forte, idempotência e autorização.
- Inbox persiste mensagens e cria resposta fictícia imediatamente com timestamp futuro; não há realtime ou provedor externo.
- Configurações expõem CRUD de profissionais/procedimentos/recursos; clínicas/horários não têm endpoints próprios completos.

MongoDB é obrigatório já no import (`MONGO_URL`, `DB_NAME`). Não há definição de índices, unicidade, transações, migrations, backup ou lifecycle. O isolamento lógico usa `tenant_id` em queries, mas o tenant é escolhido por slug público e não derivado de identidade autenticada. Algumas buscas de dados associados usam apenas ID; mesmo quando IDs são opacos, isso fragiliza defesa em profundidade.

O startup executa auto-seed se não houver tenant. `POST /api/seed` é público, destrutivo e idempotente para a demo. Os testes também o chamam automaticamente e dependem de um backend já em execução e de MongoDB.

## Segurança e conformidade

### Crítico

- **Ausência total de autenticação/autorização/RBAC:** leitura e escrita administrativas públicas.
- **IDOR/multi-tenancy:** alterar o slug concede acesso lógico a outro tenant; filtro por `tenant_id` não equivale a autorização.
- **Seed destrutivo público:** qualquer cliente pode apagar/recriar a demo e causar perda/indisponibilidade.
- **CORS:** default `*`, todos os métodos/headers e `allow_credentials=True`; combinação ampla e inadequada para produção.

### Alto/médio

- Endpoint público retorna dados do paciente e do profissional junto ao orçamento; token bearer aparece na URL e pode vazar por histórico/referrer/logs.
- Evidência LGPD guarda quatro últimos dígitos do CPF e nome; não há base legal, política, revogação, exportação, deleção, retenção, DPO ou auditoria.
- Seed contém nomes, telefones, e-mails e endereços fictícios plausíveis; devem ser sempre identificados como sintéticos e nunca misturados a produção.
- Logging padrão não registra auditoria; o código não loga payloads deliberadamente, mas logs de servidor/proxy podem capturar URLs/tokens.
- Validações são permissivas (datas em strings, status/canais/tipos livres, limites e relações incompletos).
- Sem rate limiting, CSRF strategy, security headers, gestão de sessão, criptografia em campo ou segregação de funções.

### Secrets e dependências

Nenhum `.env` versionado foi encontrado e a busca heurística não identificou credencial literal confirmada. Há URLs públicas da Emergent e números/dados sintéticos, não secrets. Valores devem continuar mascarados caso `.env` local seja inspecionado fora do Git.

Não foi possível consultar vulnerabilidades conhecidas: `yarn audit` foi bloqueado pelo proxy e `pip audit` não existe neste pip/ambiente. As muitas resoluções de segurança no `package.json` indicam manutenção reativa, mas não substituem relatório reproduzível. `requirements.txt` mistura runtime e ferramentas de desenvolvimento e usa vários limites mínimos não travados.

## Integrações e funcionalidades ausentes

WhatsApp, Instagram e Facebook são somente valores de canal e dados seed; não há Meta Cloud API, webhooks, credenciais, templates, opt-in ou entrega real. Asaas não existe. Não há e-mail/magic link, super admin, billing, webhooks, realtime, jobs confiáveis, relatórios exportáveis ou observabilidade estruturada. Os scripts `.emergent/cron` são infraestrutura específica do gerador, não implementação de produto comprovada.

## Débitos técnicos e dependências da Emergent

- Backend monolítico, sem camadas, contratos versionados ou unit tests isolados.
- Frontend sem testes e sem tratamento consistente de loading/error.
- Ausência de lockfile/CI e baseline não reproduzível.
- CRA/CRACO e JavaScript divergem do destino Next.js/TypeScript.
- Mongo sem schema/index/migration diverge de Prisma/PostgreSQL.
- `.emergent/`, `@emergentbase/visual-edits`, script `assets.emergent.sh`, título/metadescrição Emergent, config CRACO e artefatos de relatório acoplam o protótipo ao ambiente original.
- Não há contrato formal de tenancy, segurança, LGPD ou integração.

## Conclusão e próxima ação

Preservar o baseline com a tag e branch sugeridas; depois aprovar arquitetura de identidade/tenant e modelo relacional antes de qualquer migração. Em fase futura, construir um novo shell Next.js/TypeScript e portar os componentes visuais seletivamente, mantendo o protótipo como referência. **Nenhuma migration, schema Prisma, banco Neon, Vercel, autenticação, integração, refatoração ou alteração funcional foi executada nesta auditoria.**
