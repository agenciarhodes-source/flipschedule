# Resultados da baseline — FlipSchedule

**Execução:** 2026-07-28, ambiente não interativo. Os erros abaixo são mantidos sem ocultação e sem credenciais inventadas.

## Preservação e ferramentas

| Comando | Resultado |
|---|---|
| `git status --short --branch` (antes de alterações) | Aprovado: `## work`, árvore limpa |
| `git rev-parse HEAD` | Aprovado: `c80479882a4a7e27de0c2c746ab87b7c508ea781` |
| `git branch --show-current` | Aprovado: `work` antes da nova branch |
| `git switch -c chore/phase-0-current-state-audit` | Aprovado |
| `node --version` | `v24.15.0` |
| `yarn --version` | `4.14.1` disponível globalmente; o projeto declara/pede Yarn `1.22.22` via Corepack |
| `npm --version` | `11.4.2`; warning: configuração desconhecida `http-proxy` será recusada em versão futura |
| `python --version` | `Python 3.14.4` |
| `pip --version` | `pip 26.1` para Python 3.14 |
| `pytest --version` | `pytest 9.0.3` global |
| `git --version` | `git 2.43.0` |

## Frontend

| Comando exato | Status | Resultado, erros e warnings |
|---|---|---|
| `cd frontend && yarn install` | **Não executou a instalação** (exit 1) | Corepack tentou obter `yarn-1.22.22.tgz`; proxy HTTP tunnel respondeu 403 e o fetch foi cancelado. Node exibiu stack trace. Nenhum lockfile foi criado. |
| `cd frontend && yarn build` | **Não executou o build** (exit 1) | Mesmo bloqueio do download do Yarn antes de iniciar CRACO. Não há resultado de compilação. |
| `cd frontend && yarn test --watchAll=false` | **Não executou testes** (exit 1) | Mesmo bloqueio do download do Yarn antes de iniciar Jest/CRACO. Além disso, a inspeção encontrou zero arquivos `*.test.*`/`*.spec.*`. |
| `cd frontend && yarn audit --groups dependencies` | **Não executou auditoria** (exit 1) | Mesmo HTTP 403 no bootstrap do Yarn; vulnerabilidades não foram consultadas. |

Não há testes aprovados ou reprovados do frontend: a ferramenta de projeto não iniciou. A falta de suite é uma descoberta separada da limitação de rede.

## Backend

| Comando exato | Status | Resultado, erros e warnings |
|---|---|---|
| `cd backend && python -m venv .venv` | **Aprovado** (exit 0) | Ambiente local criado; ignorado pelo Git. |
| `cd backend && .venv/bin/pip install -r requirements.txt` | **Falhou por ambiente** (exit 1) | Cinco tentativas ao índice falharam com proxy `403 Forbidden`; pip reportou que não encontrou `fastapi==0.110.1` porque não conseguiu acessar o índice. Houve warnings de cache não desserializável. |
| `cd backend && .venv/bin/pytest -n 0` | **Não executou** (exit 127) | `.venv/bin/pytest` não existe, consequência direta da instalação bloqueada. Mesmo com dependências, a suite exige `REACT_APP_BACKEND_URL` ou o caminho absoluto `/app/frontend/.env`, um backend em execução e MongoDB; nenhum foi inventado/provisionado. |
| `cd backend && .venv/bin/pip check` | **Aprovado, alcance vazio** (exit 0) | “No broken requirements found”, mas o venv não recebeu os requisitos; não valida a aplicação. |
| `cd backend && .venv/bin/pip audit` | **Não executou** (exit 1) | O pip instalado não possui comando `audit`; `pip-audit` não foi instalado. |

A inspeção estática encontrou 27 testes de integração em `backend/tests/test_flipschedule_api.py`. **Zero foi executado, aprovado ou reprovado nesta baseline.** Eles fazem chamadas HTTP mutáveis, executam seed destrutivo em fixture de sessão e esperam estado compartilhado. `pytest.ini` configura dois workers por padrão, mas o comando solicitado `-n 0` o substituiria para execução serial.

## Dependências externas e variáveis ausentes

- Registro Yarn/NPM e índice Python acessíveis através do proxy (indisponíveis: HTTP 403).
- `MONGO_URL` e `DB_NAME` para importar/iniciar a API.
- MongoDB disponível.
- `REACT_APP_BACKEND_URL` para frontend e testes de integração.
- Backend FlipSchedule em execução para os testes HTTP.

Não foi encontrado `.env` versionado. Nenhuma credencial foi criada ou inferida.

## Resumo quantitativo

| Categoria | Aprovados | Reprovados por assertion | Não executados/bloqueados |
|---|---:|---:|---:|
| Testes frontend | 0 | 0 | Suite inexistente; runner bloqueado |
| Testes backend | 0 | 0 | 27 |
| Build frontend | 0 | 0 | 1 |
| Instalações | venv criado | 0 | Yarn e pip bloqueados |

## Interpretação

Esta baseline não demonstra sucesso nem falha funcional do produto; demonstra que o checkout não é reproduzível neste ambiente sem acesso aos registros e serviços/variáveis externos. O relatório histórico existente não foi tratado como uma nova execução. Nenhuma migration foi executada e nenhum banco foi criado ou alterado.

## Revalidação dos gates da Fase 1 — 2026-07-28

| Comando exato | Resultado |
|---|---|
| `node --version` | Aprovado: `v24.15.0` (satisfaz `>=20.9.0`; o CI declara Node 22). |
| `corepack --version` | Aprovado: `0.34.6`. |
| `pnpm --version` | Aprovado: `10.28.1`, igual ao `packageManager` e ao workflow. |
| `pnpm config get registry` | `https://registry.npmjs.org/`; warning do npm sobre `npm_config_http_proxy`. |
| `npm config get registry` | `https://registry.npmjs.org/`; mesmo warning. |
| `corepack enable` | Aprovado. |
| `pnpm install` | Bloqueado: `ERR_PNPM_FETCH_403` ao obter `@testing-library/react`; nenhuma autorização foi enviada. |
| `curl https://registry.npmjs.org/@testing-library%2Freact` | Pelo proxy obrigatório, o túnel CONNECT retornou HTTP 403; sem proxy, o host não pôde ser resolvido. Isso isola a causa no acesso de rede/proxy, não no registry configurado no repositório. |
| `pnpm install --frozen-lockfile` | Falhou corretamente com `ERR_PNPM_NO_LOCKFILE`; nenhum lockfile sintético foi criado. |
| `pnpm lint` | Não validado: dependência local `@eslint/eslintrc` ausente após a instalação bloqueada. |
| `pnpm typecheck` | Não validado: tipos e módulos locais ausentes após a instalação bloqueada. |
| `pnpm test` | Não executou: `vitest: not found`. |
| `pnpm build` | Não executou: `next: not found`. |
| `pnpm check` | Não validado: interrompeu no lint pela ausência das dependências. |
| `pnpm dev` | Não executável pela ausência do pacote `next`; browser verification não realizada. |

O workflow permanece coerente: pnpm 10.28.1, Node 22, cache pnpm dependente do lockfile, instalação com `--frozen-lockfile`, lint, typecheck, testes e build, sem secrets e sem deploy. Não existe remote Git configurado neste checkout, portanto não houve push nem execução observável do GitHub Actions e **CI não é declarada verde**. `frontend/` e `backend/` não foram alterados; seus testes não foram repetidos.
