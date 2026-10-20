-- ============================================================================
-- 0014 — Técnicas avançadas no volume semanal
-- * exercicios.tecnica aceita 'myo_reps'.
-- * exercicios.tecnica_extras: drops (drop set) ou mini-séries (rest-pause,
--   myo-reps) em cada série com a técnica. null = padrão do app.
-- * exercicios.tecnica_series: em quantas séries válidas a técnica é aplicada.
--   null = padrão (última série; myo-reps: todas).
-- Aditiva: nenhum dado existente muda; prescrições antigas ficam com null.
-- ============================================================================

alter table exercicios add column if not exists tecnica_extras smallint
  check (tecnica_extras is null or tecnica_extras between 0 and 10);
alter table exercicios add column if not exists tecnica_series smallint
  check (tecnica_series is null or tecnica_series between 0 and 20);

-- Amplia a lista de técnicas (o check antigo é recriado com 'myo_reps').
alter table exercicios drop constraint if exists exercicios_tecnica_check;
alter table exercicios add constraint exercicios_tecnica_check
  check (tecnica in ('normal','superset','biset','dropset','rest_pause','cluster','piramide','isometria','unilateral','myo_reps'));
