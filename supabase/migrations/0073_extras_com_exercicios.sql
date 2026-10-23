-- ============================================================================
-- 0073 — Treino extra aprovado pelo personal com a lista de exercícios
-- (nome, biblioteca, séries, reps). O aluno abre e registra série por série,
-- como num treino normal; as regras do extra (dor, 48 h, limites) continuam.
-- ============================================================================
alter table extras_liberados add column if not exists exercicios jsonb;
alter table extras_liberados drop constraint if exists extras_liberados_exercicios_check;
alter table extras_liberados add constraint extras_liberados_exercicios_check
  check (exercicios is null or (jsonb_typeof(exercicios) = 'array' and jsonb_array_length(exercicios) between 1 and 8));
