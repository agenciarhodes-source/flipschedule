# ADR-0001 — Stack da aplicação

- **Status:** Aceito
- **Data:** 2026-07-28

## Contexto

O protótipo usa React/CRA/CRACO e FastAPI/MongoDB. A reconstrução precisa de uma stack oficial, tipada e adequada ao deploy alvo, preservando a referência visual.

## Decisão

Adotar Next.js com App Router, React, TypeScript estrito, Tailwind CSS, shadcn/ui, React Hook Form e Zod. Organizar regras server-side em serviços de domínio testáveis; Server Components são padrão e Client Components são opt-in. O protótipo não será removido antes de equivalência aprovada.

## Consequências

CRA/CRACO e BrowserRouter não seguem para o alvo. Componentes/tokens podem ser portados seletivamente. A equipe precisa definir limites server/client, validação runtime, testes e CI. Esta decisão não instala dependências nem decide autenticação, banco ou jobs.

## Alternativas consideradas

Manter CRA + FastAPI indefinidamente; adotar SPA separada; migração big-bang. Foram rejeitadas como arquitetura final por divergirem do alvo ou elevarem risco de perda de referência.
