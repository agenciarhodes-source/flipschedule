# Dados sintéticos de staging

`APP_ENV=staging SEED_CONFIRMATION=SEED_SYNTHETIC_STAGING SEED_TENANT_SLUG=<existente> pnpm ops:seed-staging` é explícito e idempotente. O seed não cria tenant, User, senha, operador, billing ou integração; não apaga dados e cria somente procedimento marcado `[SINTÉTICO STAGING]`. O schema não possui campo de origem apropriado, portanto a marcação fica no nome/categoria e nenhuma migration foi criada. Use apenas domínios `example.test` e identidades obviamente fictícias em extensões futuras.
