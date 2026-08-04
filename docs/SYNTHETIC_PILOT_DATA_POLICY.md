# Política de dados do ensaio técnico sintético do piloto

- Nomes têm `[SINTÉTICO]`; slugs são reservados; identidades usam apenas `example.test`.
- CPF, CNPJ, telefone, endereço e dados clínicos plausíveis são proibidos; campos opcionais ficam nulos.
- Dinheiro usa centavos inteiros; datas são fixas em UTC e o tenant usa timezone IANA.
- O seed é aditivo e idempotente, não apaga dados e usa chaves determinísticas só no namespace sintético.
- Exige staging/rehearsal, `SEED_SYNTHETIC_PILOT`, allowlist exata e efeitos desabilitados; production e Neon são recusados.
- Não existe migration ou metadata de rehearsal. Resultados existem apenas em memória, `/tmp` e summary sanitizado.
