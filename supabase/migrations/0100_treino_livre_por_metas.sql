-- ============================================================================
-- 0100 — Treino livre por metas (pedido do Montinho em 28/10/2026).
-- programas.estilo:
--   'fichas'      = como sempre: treinos A, B, C… montados pelo personal;
--   'livre_metas' = sem fichas: só a faixa de séries por semana de cada
--                   músculo (programas.metas_volume). O aluno treina quando e
--                   como dá, escolhe cada exercício na hora (treino livre) e o
--                   app mostra o placar da semana e sugere o que fazer.
-- Aditiva: todo programa existente continua 'fichas'.
-- (O “Meu treino” do personal usa uma ficha de aluno ligada ao próprio login:
-- alunos.profile_id já é único e o personal já pode criar alunos — sem mudança.)
-- ============================================================================
alter table programas add column if not exists estilo text not null default 'fichas';
alter table programas drop constraint if exists programas_estilo_check;
alter table programas add constraint programas_estilo_check check (estilo in ('fichas', 'livre_metas'));
