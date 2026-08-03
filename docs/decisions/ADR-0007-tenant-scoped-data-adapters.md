# ADR-0007 — Adaptadores de dados tenant-scoped

- Status: Aceito
- Data: 2026-08-03

## Contexto

A demonstração usa fixtures, enquanto as rotas autenticadas precisam consultar PostgreSQL sem acoplar componentes React ao Prisma, à sessão ou ao modelo relacional. O tenant deve continuar sendo derivado exclusivamente da membership ativa validada no servidor.

## Decisão

Adotamos contratos de leitura e view models em `domains/application`, com implementações intercambiáveis em `domains/infrastructure/demo` e `domains/infrastructure/prisma`. Um `ApplicationContext` mínimo é criado a partir do guard de autenticação existente. Adaptadores Prisma são `server-only`, recebem esse contexto confiável no construtor, aplicam `tenantId` em toda consulta, usam seleção explícita, paginação limitada e ordenação determinística.

As fixtures continuam sendo a única fonte de dados de `/demo`. Erros e tipos do Prisma não fazem parte dos contratos da apresentação. Escritas, RBAC por operação e conexão dos módulos visuais permanecem para fases posteriores.

## Consequências

- componentes e rotas podem depender de contratos estáveis e view models serializáveis;
- testes e demonstração não precisam de banco ou autenticação;
- consultas reais têm isolamento tenant explícito e revisável;
- novos casos de uso deverão traduzir falhas de infraestrutura em erros de aplicação antes de apresentá-las ao usuário.

