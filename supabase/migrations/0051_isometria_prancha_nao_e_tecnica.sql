-- ============================================================================
-- 0051 — Isometria em exercício já parado por natureza (prancha etc.) não é
-- técnica avançada (pedido do personal, 22/10/2026; regra em
-- src/lib/conquistas/regras.ts#exercicioJaIsometrico). Remove as medalhas de
-- técnica que contaram “Isometria” por causa da prancha; o app recria, na
-- próxima sincronização, só as que a nova regra sustenta (ex.: Pirâmide, Bi-set).
-- Medalhas derivadas (não são histórico de treino). Idempotente.
-- ============================================================================
delete from conquistas_aluno c
where c.codigo in ('primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas')
  and c.descricao ilike '%Isometria%'
  and exists (
    select 1 from training_sessions s
    join session_exercises e on e.session_id = s.id
    where s.aluno_id = c.aluno_id and e.prescricao->>'tecnica' = 'isometria'
      and (e.nome ilike '%prancha%' or e.nome ilike '%plank%')
  );
