-- ============================================================================
-- 0026 — O personal também pode REGISTRAR conquistas do aluno.
-- As conquistas são detectadas pelas mesmas regras (src/lib/conquistas), só
-- que no momento em que o personal registra treinos (ex.: histórico de outro
-- app), sem esperar o aluno abrir o app. Continua sem update/delete; a chave
-- única (aluno, código, referência) impede duplicar.
-- ============================================================================
drop policy if exists conquistas_treinador_insere on conquistas_aluno;
create policy conquistas_treinador_insere on conquistas_aluno for insert with check ((select public.is_treinador()));
