-- ============================================================================
-- 0033 — Métodos avançados no montador: pirâmide decrescente, tri-set,
-- combinado, pré-exaustão, 3/7, super slow e negativo.
-- Aditiva: só amplia a lista aceita de técnicas; nada existente muda.
-- ============================================================================
alter table exercicios drop constraint if exists exercicios_tecnica_check;
alter table exercicios add constraint exercicios_tecnica_check
  check (tecnica in ('normal','superset','biset','dropset','rest_pause','cluster','piramide','isometria','unilateral','myo_reps',
                     'piramide_decrescente','triset','combinado','pre_exaustao','tres_sete','super_slow','negativo'));
