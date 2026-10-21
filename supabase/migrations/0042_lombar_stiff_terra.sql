-- ============================================================================
-- 0042 — Lombar no volume ponderado de stiff, terra e good morning (pedido do
-- personal): todos com lombar como secundário (stiff unilateral ganha 0,25).
-- Idempotente.
-- ============================================================================
update exercicios_biblioteca set pesos_secundarios = pesos_secundarios || '{"lombar": 0.25}'::jsonb
where slug = 'stiff-unilateral' and not (pesos_secundarios ? 'lombar');
update exercicios_biblioteca set grupos_secundarios = array(select distinct unnest(grupos_secundarios || array['lombar'::grupo_muscular]))
where slug in ('good-morning', 'levantamento-terra', 'terra-romeno', 'terra-sumo', 'stiff-barra', 'stiff-halteres', 'stiff-unilateral')
  and not ('lombar'::grupo_muscular = any(grupos_secundarios));
