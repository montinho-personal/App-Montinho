-- ============================================================================
-- 0106 — Biblioteca: “Abdominal remador no banco” (pedido do personal em
-- 28/10/2026), com o vídeo que ele mandou (YouTube Shorts, validado por ele).
-- Mesma classificação do abdominal remador do chão (flexão de tronco,
-- abdômen); o do chão continua com o vídeo dele. Idempotente.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, thumbnail_url, video_validado)
values (
  '69515137-7c95-4491-97bb-c4b3cc094746', 'Abdominal remador no banco', 'abdominal-remador-banco', 'abdomen', '{}', '{banco,peso_corporal}',
  array['Sentado na ponta do banco, mãos apoiadas atrás e tronco levemente inclinado para trás.', 'Traga os joelhos em direção ao peito enquanto aproxima o tronco das pernas.', 'Volte estendendo as pernas sem encostar os pés no chão.'],
  array['abdominal remador no banco', 'remador no banco', 'abdominal canoinha no banco', 'abdominal sentado no banco'],
  'manual', 'flexao_tronco', array['coluna', 'quadril'], 'monoarticular',
  array['Puxar com o pescoço.', 'Deixar a lombar arredondar demais.', 'Fazer rápido, sem controle na volta.'],
  array['repeticoes', 'carga'], '{}'::jsonb, '{}', 'iniciante', true, 'treinador',
  'youtube', 'e8ntmgQOdGs', 'https://i.ytimg.com/vi/e8ntmgQOdGs/hqdefault.jpg', true
)
on conflict (slug) do update set video_provider = 'youtube', video_id = 'e8ntmgQOdGs',
  thumbnail_url = 'https://i.ytimg.com/vi/e8ntmgQOdGs/hqdefault.jpg', video_validado = true
  where exercicios_biblioteca.video_id is distinct from 'e8ntmgQOdGs';
