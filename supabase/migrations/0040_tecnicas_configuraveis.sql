-- ============================================================================
-- 0040 — Técnicas avançadas configuráveis.
-- • exercicios.tecnica_config: como o personal configurou a técnica
--   (séries de finalização, reps alvo, pausa, drops, redução %, blocos…).
--   Formato em src/lib/treino/tecnica-config.ts. null = valores padrão.
-- • session_sets.blocos: os pedaços de uma série em blocos (rest-pause,
--   drop-set, myo-reps, cluster, 3/7): [{"carga": 40, "reps": 12}, …].
--   `reps` continua sendo o total e `carga_kg` a carga inicial.
-- • session_sets.tipo aceita myo_reps e tres_sete (séries de finalização).
-- Aditiva e idempotente.
-- ============================================================================
alter table exercicios add column if not exists tecnica_config jsonb;
alter table session_sets add column if not exists blocos jsonb;
alter table session_sets drop constraint if exists session_sets_tipo_check;
alter table session_sets add constraint session_sets_tipo_check check (tipo in ('valida','aquecimento','dropset','rest_pause','cluster','isometria','myo_reps','tres_sete'));
