-- ============================================================================
-- 0032 — Troca de exercício pelo aluno durante o treino.
-- • session_exercises.substituido_de: o exercício do plano que foi trocado
--   (nome, biblioteca_id, grupo_muscular). Nulo = sem troca.
-- • equivalencias_revisadas(): o app do aluno precisa respeitar as trocas que
--   o personal aprovou/rejeitou. A tabela continua fechada para o aluno
--   (T7c); a função devolve só (exercício, alternativa, status) — sem notas.
-- Aditiva: nada existente muda.
-- ============================================================================
alter table session_exercises add column if not exists substituido_de jsonb;

create or replace function equivalencias_revisadas()
returns table (exercicio_id uuid, alternativa_id uuid, origem text, status text)
language sql stable security definer set search_path = public as $$
  select e.exercicio_id, e.alternativa_id, e.origem::text, e.status::text
  from exercicio_equivalencias e
  where auth.uid() is not null
$$;
revoke all on function equivalencias_revisadas() from public;
grant execute on function equivalencias_revisadas() to authenticated;
