# Workflows protegidos de staging

A migration manual aceita apenas confirmação literal, backup confirmado e `change_id` restrito. O job `validate`, sem environment ou secrets, exige `refs/heads/main`, SHA completo, valida inputs e calcula o digest. Só depois da aprovação do GitHub Environment o job `migrate` faz checkout do mesmo `github.sha`. Actions estão pinadas e credenciais Git não persistem.

Secrets são scoped aos passos de preflight e banco. Checkout, setup, install e validação estrutural não recebem secrets. O smoke recebe URL e hostname exato somente das variáveis protegidas de staging e bloqueia production, IP privado, credenciais e URL não canônica.
