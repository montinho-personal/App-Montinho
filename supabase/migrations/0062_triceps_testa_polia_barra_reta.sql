-- ============================================================================
-- 0062 — Biblioteca: “Tríceps testa na polia com barra reta” (ficha da Naya,
-- pedido do personal em 22/10/2026). Mesma classificação do tríceps testa
-- com barra W (extensão de cotovelo, monoarticular), só que na polia: a
-- tensão do cabo continua no fim do movimento. Sem vídeo ainda.
-- Idempotente.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, video_validado)
values (
  'a3c51e7d-2b84-4f6a-9d10-7e2b5c8f4a62', 'Tríceps testa na polia com barra reta', 'triceps-testa-polia-barra-reta', 'triceps', '{}', '{polia,banco}',
  array['Deitado no banco com a cabeça voltada para a polia baixa, barra reta acima do peito e braços estendidos.', 'Flexione os cotovelos levando a barra em direção à testa, sem abrir os cotovelos.', 'Estenda os cotovelos até o alto, mantendo os braços parados.'],
  array['tríceps testa na polia', 'testa na polia', 'tríceps testa polia barra reta', 'tríceps testa no cabo', 'cable skull crusher'],
  'manual', 'extensao_cotovelo', array['cotovelo', 'ombro'], 'monoarticular',
  array['Cotovelos abrindo.', 'Mover os ombros junto.', 'Soltar o peso na volta.'],
  array['carga', 'repeticoes'], '{}'::jsonb, array['cotovelo_punho'], 'iniciante', true, 'treinador',
  null, null, false
)
on conflict (slug) do nothing;
