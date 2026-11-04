-- ============================================================================
-- 0143 — “Rosca inversa (pegada pronada)” conta SÓ para antebraço
-- (pedido do Montinho, 04/11/2026, igual à 0142). O músculo principal já era
-- antebraço; sai o bíceps como secundário (contava 0,5). Fichas ativas sem
-- secundários. Nada é apagado; histórico intocado. Idempotente.
-- ============================================================================
update exercicios_biblioteca
set grupo_muscular = 'antebraco', grupos_secundarios = '{}'::grupo_muscular[], pesos_secundarios = '{}'::jsonb
where slug = 'rosca-inversa'
  and (grupo_muscular is distinct from 'antebraco' or grupos_secundarios <> '{}'::grupo_muscular[] or pesos_secundarios <> '{}'::jsonb);

update exercicios e
set grupo_muscular = 'antebraco', grupos_secundarios = '{}'::grupo_muscular[]
from treinos t
where t.id = e.treino_id and t.ativo and e.removido_em is null
  and e.biblioteca_id = (select id from exercicios_biblioteca where slug = 'rosca-inversa')
  and (e.grupo_muscular is distinct from 'antebraco' or e.grupos_secundarios <> '{}'::grupo_muscular[]);
