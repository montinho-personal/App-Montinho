-- ============================================================================
-- 0031 — Percepção de esforço por exercício (o aluno responde ao finalizar
-- cada exercício: muito leve / moderado / pesado; "muito_pesado" reservado).
-- Aditiva: coluna opcional; nada existente muda.
-- ============================================================================
alter table session_exercises add column if not exists percepcao text;
alter table session_exercises drop constraint if exists session_exercises_percepcao_check;
alter table session_exercises add constraint session_exercises_percepcao_check check (percepcao is null or percepcao in ('muito_leve','moderado','pesado','muito_pesado'));
