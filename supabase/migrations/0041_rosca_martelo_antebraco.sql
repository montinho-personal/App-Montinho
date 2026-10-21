-- ============================================================================
-- 0041 — Rosca martelo: antebraço (braquiorradial) conta igual ao bíceps no
-- volume ponderado (peso 1), a pedido do personal. Vale para as 3 variações.
-- Idempotente.
-- ============================================================================
update exercicios_biblioteca
set pesos_secundarios = coalesce(pesos_secundarios, '{}'::jsonb) || '{"antebraco": 1}'::jsonb
where slug in ('rosca-martelo', 'rosca-martelo-corda', 'rosca-martelo-banco-inclinado');
