# Ensaio de autenticação e acessos

O PR 51 estabelece um ensaio permanente e descartável para a matriz de autenticação do FlipSchedule.

## Perfis verificados

- operador ativo da plataforma, com destino `/admin`;
- proprietário ativo de clínica, com destino `/{tenantSlug}/dashboard`;
- usuário de clínica com senha temporária, com destino `/first-access`;
- usuário suspenso, impedido de criar sessão;
- usuário de tenant suspenso, direcionado para `/access-pending`;
- usuário de tenant arquivado, direcionado para `/access-pending`.

O ensaio também confirma logout, invalidação de sessão expirada, política de uma hora sem atividade e comportamento por aba coberto pela suíte de interface.

## Segurança operacional

O workflow usa PostgreSQL 17 descartável, credenciais exclusivamente sintéticas `@example.test`, segredo efêmero e `EXTERNAL_EFFECTS_MODE=DISABLED`. Nenhum e-mail, cobrança, webhook ou ambiente externo é acionado.

A política de login retorna uma falha genérica para usuários suspensos ou desabilitados. Contas inexistentes continuam no fluxo normal de validação de credenciais para evitar enumeração.

## Execução local

Com um PostgreSQL descartável e as migrations aplicadas:

```bash
NODE_OPTIONS=--conditions=react-server pnpm exec tsx scripts/auth-access-rehearsal.ts
```

O script não deve ser executado contra produção. Os endereços sintéticos, slugs e senha utilizados são reservados ao ensaio automatizado.
