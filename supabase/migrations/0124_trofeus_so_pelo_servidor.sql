-- 0124 — Troféus só pelo servidor (auditoria de 29/10/2026). O aluno conseguia
-- inserir qualquer código de troféu para si mesmo direto pela chave pública
-- (política conquistas_aluno_insere) e subir no ranking. Agora:
--   • o aluno NÃO insere em conquistas_aluno (continua lendo os dele e marcando
--     vista_em — o UPDATE já é só dessa coluna);
--   • o app calcula os troféus pelas regras e grava com a chave do servidor
--     (src/lib/data/conquistas.ts#gravadorDeConquistas);
--   • o personal continua podendo gravar (Olhar de Águia e recálculo pelo painel).
drop policy if exists conquistas_aluno_insere on conquistas_aluno;
