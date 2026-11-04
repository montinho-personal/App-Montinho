-- ============================================================================
-- 0142 — “Rosca inversa na polia com barra W” conta SÓ para antebraço
-- (pedido do Montinho, 04/11/2026: “é para antebraço apenas e não bíceps”).
-- Biblioteca: músculo principal = antebraço, sem secundários (sai o bíceps).
-- Fichas ATIVAS que usam o exercício (vindas da biblioteca ou do cadastro do
-- personal): grupo vira antebraço, sem secundários. Nada é apagado; fichas
-- arquivadas e o histórico de treinos feitos ficam como estão. Idempotente.
-- ============================================================================
update exercicios_biblioteca
set grupo_muscular = 'antebraco', grupos_secundarios = '{}'::grupo_muscular[], pesos_secundarios = '{}'::jsonb
where slug = 'rosca-inversa-na-polia-com-barra-w'
  and (grupo_muscular is distinct from 'antebraco' or grupos_secundarios <> '{}'::grupo_muscular[] or pesos_secundarios <> '{}'::jsonb);

update exercicios e
set grupo_muscular = 'antebraco', grupos_secundarios = '{}'::grupo_muscular[]
from treinos t
where t.id = e.treino_id and t.ativo and e.removido_em is null
  and e.biblioteca_id = (select id from exercicios_biblioteca where slug = 'rosca-inversa-na-polia-com-barra-w')
  and e.grupo_muscular is distinct from 'antebraco';
