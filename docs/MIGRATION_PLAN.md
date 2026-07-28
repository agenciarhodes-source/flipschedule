# Plano progressivo de reconstrução

## Estratégia

Usar migração incremental com o protótipo preservado como referência visual e funcional. Cada fase tem critérios de entrada/saída, testes e rollback/forward-fix. Não remover frontend ou FastAPI até equivalência explicitamente aprovada. Migração de dados reais exigirá plano próprio de inventário, transformação, reconciliação e cutover; não é autorizada aqui.

## Fase 0 — diagnóstico e preparação

Consolidar auditoria, requisitos, arquitetura, segurança, ambientes, modelo conceitual e ADRs. Preservar baseline Emergent. **Saída:** documentos coerentes e pendências identificadas. Esta fase não instala stack nem cria infraestrutura.

## Fase 1 — nova fundação Next.js

Criar aplicação Next.js App Router/TypeScript estrito, Tailwind/shadcn, quality gates, testes e shell visual equivalente. Portar apenas tokens/primitives aprovados. **Saída:** aplicação sem dados reais, CI verde e comparação visual aprovada. Não remover frontend antigo.

## Fase 2 — Neon e Prisma

Provisionar bancos isolados somente após aprovação; definir schema Prisma, constraints, migrations, seeds fictícios e acesso server-only. **Saída:** modelo mínimo testado, migrations reproduzíveis e procedimentos de backup/rollback. Não migrar dados de produção sem plano separado.

## Fase 3 — autenticação e multi-tenancy

Escolher solução de autenticação, implementar sessões seguras, memberships, resolução de tenant, troca autorizada, RBAC, auditoria e testes cross-tenant. **Saída:** deny-by-default e matriz de permissões validada. Nenhum módulo sensível é liberado antes disso.

## Fase 4 — módulos centrais

Implementar por fatias: configurações/cadastros, pacientes/consentimentos, agenda, CRM, orçamentos/página pública, dashboard e inbox base. Preservar identidade e validar equivalência. **Saída:** fluxos críticos, concorrência, timezone, centavos, E.164, CPF e LGPD testados.

## Fase 5 — cobrança Asaas

Implementar adapter, clientes, assinaturas, cobranças, webhooks idempotentes, reconciliação, auditoria e entitlement. **Saída:** sandbox validado e runbook de falhas; nenhuma chave real em preview.

## Fase 6 — produção e domínios

Configurar Vercel/Neon de produção, DNS após domínio aprovado, secrets, backups, observabilidade, CI/CD, migrations controladas e runbooks. **Saída:** smoke tests e recuperação ensaiada. Deploy não ativa automaticamente todas as features.

## Fase 7 — WhatsApp e comunicação

Integrar WhatsApp Cloud API, e-mail e jobs necessários, com opt-in, templates, verificação, idempotência e inbox. **Saída:** envio/recebimento e falhas/retries validados em tenant piloto.

## Fase 8 — Meta e atribuição

Adicionar Instagram, Messenger e Facebook Lead Ads, respeitando permissões, webhooks, associação tenant e atribuição definida. **Saída:** reconciliação e métricas validadas; não inclui IA ou novos canais.

## Fase 9 — segurança, piloto e lançamento

Executar threat model final, revisão LGPD/jurídica, testes de isolamento/carga/recuperação, pentest proporcional, piloto limitado, correções e checklist de go-live. **Saída:** aceite explícito de produto, segurança e operação; monitoramento e suporte ativos.

## Regras de transição

- Não fazer big-bang nem apagar o protótipo para “abrir espaço”.
- Não manter escrita dupla sem desenho de consistência, observabilidade e reconciliação.
- Comparar registros e totais antes de qualquer cutover; preservar rollback ou forward-fix seguro.
- Toda fase cria evidência de testes e atualiza `ROADMAP.md`; avançar não significa que fases anteriores possam perder seus controles.
