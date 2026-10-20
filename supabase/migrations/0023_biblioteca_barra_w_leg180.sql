-- ============================================================================
-- 0023 — Biblioteca: “Tríceps pulley com barra W” (pedido do personal) e
-- sinônimos “leg press 180” para o leg press horizontal (mesmo aparelho).
-- Idempotente: pode rodar de novo sem duplicar.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem)
values (
  'b7a3f0c2-5e1d-4c8a-9f2b-0d6e4a1c7b3e', 'Tríceps pulley com barra W', 'triceps-pulley-barra-w', 'triceps', '{}', '{polia}',
  array['Barra W na polia alta, pegada pronada nas curvas da barra.', 'Estenda os cotovelos mantendo-os junto ao corpo.', 'Volte controlando.'],
  array['tríceps pulley barra w', 'tríceps barra w', 'pulley barra w', 'tríceps polia barra w'],
  'manual', 'extensao_cotovelo', array['cotovelo'], 'monoarticular',
  array['Cotovelos abrindo.', 'Usar o peso do corpo.', 'Amplitude curta.'],
  array['carga', 'repeticoes'], '{}'::jsonb, array[]::text[], 'iniciante', true, 'treinador'
)
on conflict (slug) do nothing;

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(coalesce(sinonimos, '{}') || array['leg press 180', 'leg press 180°']))
where slug = 'leg-press-horizontal';

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(coalesce(sinonimos, '{}') || array['panturrilha no leg press 180', 'panturrilha leg press horizontal']))
where nome = 'Panturrilha no leg press';
