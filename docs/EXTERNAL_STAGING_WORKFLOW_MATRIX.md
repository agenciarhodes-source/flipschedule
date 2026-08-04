# Matriz de workflows de staging

| Workflow | Gatilho | Ambiente | Efeito |
|---|---|---|---|
| External staging assisted rehearsal | PR/manual | PostgreSQL 17 descartável | ensaio local |
| External staging validation | manual/main | staging protegido | somente leitura |
| External staging synthetic seed | manual/main | staging protegido | seed sintético idempotente |
| Staging authenticated smoke | manual/main | staging protegido | smoke autenticado |
| Staging restore validation | manual/main | restore isolado | somente validação |
| Human pilot readiness review | manual/main | staging protegido | registra gates, não ativa piloto |

Secrets permanecem no step protegido; checkout usa `github.sha`, profundidade 1 e credenciais desabilitadas.
