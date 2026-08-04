# Evidência do ensaio descartável de backup e restore

O artefato válido é o `GITHUB_STEP_SUMMARY` sanitizado do workflow **Backup restore rehearsal**, associado ao SHA imutável. Sucesso só é publicado após restore, verificação, testes focados, lint, typecheck, build e confirmação de limpeza.

Este documento registra a implementação, não inventa uma execução remota. Quando o CI ficar verde, o resumo comprovará migration count/digest, dataset, checksum/tamanho do dump, aliases dos dois bancos, total de checks, fingerprints iguais, origem preservada, dump removido e zero efeitos externos. O dump não é anexado.

Não houve backup Neon, restore externo de staging/production, dados reais ou validação do mecanismo gerenciado do provider. RPO/RTO, retenção, criptografia do provider, alertas, revisão jurídica, clínica piloto, treinamento e go-live permanecem pendentes.
