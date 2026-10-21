-- ============================================================================
-- 0047 — Meio terra no Smith: lombar passa a contar 1 no volume ponderado
-- (pedido do personal: “um no lombar junto com o glúteo”). Demais pesos sem
-- mudança. Idempotente.
-- ============================================================================
update exercicios_biblioteca
set pesos_secundarios = pesos_secundarios || '{"lombar": 1}'::jsonb
where slug = 'meio-terra-smith' and (pesos_secundarios->>'lombar') is distinct from '1';
