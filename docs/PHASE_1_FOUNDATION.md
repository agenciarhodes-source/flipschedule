# Fase 1 — Fundação Next.js

## Estado e escopo

Esta entrega inicia, mas não conclui, a Fase 1. Ela cria a fundação técnica na raiz e mantém `frontend/` e `backend/` como referências intactas. A documentação normativa prevê que a saída completa da fase inclua equivalência e aprovação visual; a tarefa atual explicitamente limita o escopo a páginas identificáveis, sem portar telas. Isso é uma diferença de abrangência, não uma mudança arquitetural: a equivalência visual permanece pendente antes de concluir a fase.

## Stack e versões declaradas

O package manager é pnpm 10.28.1. O manifesto fixa Next.js 15.5.7, React/React DOM 19.1.0, TypeScript 5.7.2, Tailwind CSS 3.4.17, ESLint 9.17.0 e Vitest 2.1.8, além das dependências mínimas de UI, validação e testes listadas em `package.json`.

A instalação não foi concluída neste ambiente: o registry npm respondeu HTTP 403, sem credenciais, ao `pnpm install`. Portanto, estas são versões declaradas e **não versões efetivamente instaladas ou validadas** nesta execução; o lockfile também não pôde ser produzido. Essa pendência bloqueia os quality gates e deve ser resolvida antes de merge.

## Estrutura criada

- `app/`: App Router, layouts, estados globais e route groups.
- `components/`: componente de fundação e primitives `Button` e `Card` compatíveis com shadcn/ui.
- `domains/`: ponto de extensão vazio para serviços de domínio futuros.
- `lib/`: constante de produto, utilitário de classes e tipo de navegação.
- `public/`: diretório de assets futuros, sem assets migrados.
- `tests/`: configuração e testes unitários iniciais.
- `.github/workflows/quality.yml`: CI sem deploy.

## Rotas

- `/`
- `/login`
- `/plano/[token]`
- `/[tenantSlug]/dashboard`
- `/[tenantSlug]/agenda`
- `/[tenantSlug]/inbox`
- `/[tenantSlug]/crm`
- `/[tenantSlug]/orcamentos`
- `/[tenantSlug]/pacientes`
- `/[tenantSlug]/configuracoes`

Os slugs e tokens exibidos são somente parâmetros de roteamento. Não existe autorização, sessão ou acesso a dados nesta fundação.

## Scripts e quality gates

- `pnpm dev`: servidor de desenvolvimento com Turbopack disponível pelo Next.js.
- `pnpm build` / `pnpm start`: build e servidor de produção.
- `pnpm lint`: ESLint via CLI; `next lint` não é usado para manter compatibilidade com versões modernas do Next.js.
- `pnpm typecheck`: TypeScript sem emissão.
- `pnpm test` / `pnpm test:watch`: Vitest.
- `pnpm check`: lint, typecheck, testes e build em sequência.

O TypeScript usa modo estrito, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`. `skipLibCheck` está habilitado para não tornar declarações externas um gate da aplicação; arquivos JavaScript legados são excluídos do novo projeto.

## Execução local

1. Use Node.js 22 e pnpm 10.28.1.
2. Execute `pnpm install --frozen-lockfile` depois que o lockfile for gerado em um ambiente com acesso ao registry.
3. Execute `pnpm check`.
4. Execute `pnpm dev` e abra as rotas documentadas.

## Comparação com o legado

Execute a nova aplicação a partir da raiz. Consulte `frontend/` e `backend/` somente como referências visual e funcional, usando os comandos próprios do protótipo em ambiente separado. Nenhum arquivo ou dependência legado foi alterado por esta fundação.

## Limitações e itens não implementados

Não foram implementados banco, Prisma, migrations, autenticação, RBAC, resolução segura de tenant, Neon, Vercel, deploy, domínio, integrações externas ou secrets. As páginas são marcadores mínimos, sem equivalência visual. A instalação, o lockfile, os quality gates e o smoke test manual estão pendentes devido ao bloqueio HTTP 403 do registry.

## Próxima subtarefa

Restabelecer acesso ao registry, instalar exatamente as dependências, versionar o `pnpm-lock.yaml`, executar todos os quality gates e smoke tests e, depois, iniciar a migração visual seletiva com comparação aprovada, sem remover o protótipo.
