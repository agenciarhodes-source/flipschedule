# Política RBAC

A matriz canônica está em `domains/application/rbac.ts`. `PatientService` exige `patients.manage`; `LeadService`, `crm.manage`; conversão exige ambas cumulativamente. Gestão, teste e reprocessamento de integração exigem `integrations.manage`; leitura operacional usa `integrations.read`. Todas as decisões são server-side e deny-by-default.

## Billing SaaS em Sandbox (PR 33)

A fundação de billing separa cobrança da assinatura FlipSchedule de pagamentos clínicos, usa catálogo vazio até decisão comercial, checkout Asaas hospedado, credenciais server-only, estados explícitos, idempotência, isolamento tenant e RBAC. Production, migration aplicada, preços comerciais e cobrança de pacientes permanecem pendentes. Consulte `BILLING_AND_ASAAS_INTEGRATION.md`, `BILLING_STATE_MACHINE.md` e `ASAAS_SANDBOX_RUNBOOK.md`.
