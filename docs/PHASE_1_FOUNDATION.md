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

## Migração visual do shell

### Tokens migrados

A paleta HSL do protótipo foi consolidada em `app/globals.css`: fundos `bg`, `bg-alt`, `bg-elev` e `bg-hover`; textos `ink`, `ink-muted` e `ink-dim`; bordas `line` e `line-strong`; accent, warning/warm, danger e info. Também foram incorporados radius de 8 px, sombra sutil, espaçamento fluido de página, focus visible, seleção de texto, scrollbar e redução de movimento. O Tailwind referencia as variáveis, evitando repetir hexadecimais nos componentes.

### Componentes e shell

Foram adicionados componentes compartilhados para eyebrow, cabeçalho de página, métrica, status e estados vazio/loading/erro. O shell usa sidebar fixa no desktop, topbar, área principal rolável e navegação mobile em drawer. A parte dependente de `usePathname` e o drawer são Client Components isolados; layouts e placeholders continuam server-first.

O tenant `clinica-vitalita` vem do parâmetro da URL e é resolvido somente contra um mapa fictício em `domains/demo/demo-tenants.ts`. Esse comportamento é exclusivamente visual e não representa autenticação, autorização ou permissão.

### Equivalência e diferenças conscientes

Foram preservados paleta, estética dark, famílias tipográficas, largura de sidebar, altura da topbar, densidade, labels e hierarquia editorial do AppShell legado. A landing reproduz a estrutura de cabeçalho, hero, painel de métricas, cards e rodapé sem reutilizar chamadas inseguras da demo antiga.

Diferenças deliberadas: o drawer mobile substitui a sidebar permanente em telas estreitas; áreas clicáveis têm no mínimo 44 px; foco fica contido no drawer e Escape o fecha; textos da landing não prometem integrações ainda inexistentes. Essas mudanças melhoram acessibilidade e precisão sem alterar a identidade visual.

### Testes e telas verificadas

Foram criados testes para todos os itens de navegação, item ativo com `aria-current`, tenant fictício, região `main`, labels acessíveis, abertura/fechamento do menu e fechamento por Escape com retorno de foco.

A inspeção executável de `/clinica-vitalita/dashboard`, `/agenda`, `/inbox`, `/crm`, `/orcamentos`, `/pacientes` e `/configuracoes`, em desktop e mobile, continua bloqueada porque o registry npm respondeu HTTP 403 e as dependências não puderam ser instaladas. Nenhuma tela foi marcada como visualmente aprovada sem essa verificação.
