# Checklist real de prontidão para piloto

Este PR prepara controles; não autoriza piloto nem produção.

## Automatizáveis

- [ ] suíte completa, lint, typecheck e build sem secrets aprovados no CI suportado
- [ ] schema validado e migration ensaiada fora de production
- [ ] secrets scan revisado e sem credencial real
- [ ] health endpoints e smoke em preview/staging autorizado
- [ ] isolamento tenant e RBAC, incluindo concorrência, aprovados em PostgreSQL real
- [ ] rate limiting aplicado a todos os fluxos de risco e 429 testado
- [ ] webhooks, Subscription e Payment idempotentes/tenant-scoped em integração
- [ ] logs sanitizados e diagnóstico agregado verificados

## Dependentes de execução humana ou infraestrutura

- [ ] migration ensaiada em staging
- [ ] restore real e backup real com evidências
- [ ] RPO e RTO definidos
- [ ] secrets provisionados e rotacionáveis
- [ ] domínio e TLS validados
- [ ] alertas externos e contatos de incidente ativos
- [ ] revisão jurídica/LGPD concluída
- [ ] contrato e clínica piloto aprovados
- [ ] treinamento e suporte preparados
- [ ] aprovação formal de go-live

## Bloqueios de produção

Todos os itens humanos acima; pentest; tratamento de vulnerabilidades críticas; observabilidade externa; Asaas production; DNS/Vercel/Neon production; restore comprovado; cobertura completa de rate limit e operational guards. Nada disso foi marcado como concluído.

## Staging preparado no PR 36, não executado
- [ ] criar Environment/secrets/banco staging
- [ ] executar rehearsal e snapshot
- [ ] executar migration/deploy/smoke/seed/verificação remotos
- [ ] registrar aprovação humana; preparation no código não equivale a staging ativo
