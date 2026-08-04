# Checklist de rollback de staging

- [ ] Interromper rollout e registrar evidência/correlation IDs sanitizados.
- [ ] Decidir entre artefato anterior compatível e forward-fix.
- [ ] Pausar workers/escritas se versões forem incompatíveis.
- [ ] Preservar `AuditLog`, subscriptions e payments.
- [ ] Para schema aditivo, preferir forward-fix; nunca down migration destrutiva automática.
- [ ] Restore somente em banco isolado, após decisão humana e snapshot preservado.
- [ ] Após rollback, executar live, ready, smoke e diagnóstico administrativo.
