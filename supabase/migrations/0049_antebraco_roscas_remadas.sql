-- ============================================================================
-- 0049 — Antebraço 0,25 no volume ponderado (pedido do personal):
-- • roscas de bíceps que ainda não contavam antebraço (mesmo critério das
--   outras roscas diretas);
-- • remadas e puxadas em que a pegada sustenta a carga livre (barra, halter,
--   barra fixa, remada invertida). Máquinas, polias e graviton ficam de fora.
-- Não sobrescreve quem já tem antebraço. Idempotente.
-- ============================================================================
update exercicios_biblioteca
set pesos_secundarios = pesos_secundarios || '{"antebraco": 0.25}'::jsonb,
    grupos_secundarios = array(select distinct unnest(grupos_secundarios || array['antebraco'::grupo_muscular]))
where slug in (
  'rosca-concentrada', 'rosca-inclinada-halteres', 'rosca-scott-maquina', 'rosca-spider', 'rosca-polia-unilateral-tras',
  'barra-fixa-pronada', 'barra-fixa-supinada', 'remada-curvada-barra', 'remada-curvada-supinada', 'remada-curvada-smith',
  'remada-cavalinho', 'remada-unilateral-halter', 'remada-apoiada-banco', 'remada-invertida'
)
and not (pesos_secundarios ? 'antebraco');
