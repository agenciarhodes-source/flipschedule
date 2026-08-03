# Política RBAC

A matriz canônica está em `domains/application/rbac.ts`. `PatientService` exige `patients.manage`; `LeadService`, `crm.manage`; conversão exige ambas cumulativamente. Gestão, teste e reprocessamento de integração exigem `integrations.manage`; leitura operacional usa `integrations.read`. Todas as decisões são server-side e deny-by-default.
