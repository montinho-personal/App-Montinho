-- ============================================================================
-- 0048 — Rosca inversa na polia com barra W: antebraço passa a contar 1 no
-- volume ponderado (pedido do personal: rosca inversa/invertida também conta
-- para antebraço; mesmo critério da rosca martelo, 0041). A “Rosca inversa
-- (pegada pronada)” já tem antebraço como músculo principal. Idempotente.
-- ============================================================================
update exercicios_biblioteca
set pesos_secundarios = pesos_secundarios || '{"antebraco": 1}'::jsonb,
    grupos_secundarios = array(select distinct unnest(grupos_secundarios || array['antebraco'::grupo_muscular]))
where slug = 'rosca-inversa-na-polia-com-barra-w' and (pesos_secundarios->>'antebraco') is distinct from '1';
