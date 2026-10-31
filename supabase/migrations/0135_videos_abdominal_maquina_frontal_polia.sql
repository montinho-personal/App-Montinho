-- ============================================================================
-- 0135 — Vídeos enviados pelo personal em 31/10/2026 (YouTube Shorts):
--  • “Abdominal na máquina” ganha o vídeo.
--  • “Elevação frontal na polia” (exercício novo, cadastro do personal): mesma
--    classificação da elevação frontal com halteres, na polia.
-- Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'JoRVN9R8kQo',
    thumbnail_url = 'https://i.ytimg.com/vi/JoRVN9R8kQo/hqdefault.jpg', video_validado = true
where slug = 'abdominal-maquina' and video_id is distinct from 'JoRVN9R8kQo';

insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, thumbnail_url, video_validado)
select '1d838327-c6ac-4b42-a3cb-f4182c454564', 'Elevação frontal na polia', 'elevacao-frontal-polia', grupo_muscular, grupos_secundarios, '{polia}',
  array['De costas ou de frente para a polia baixa, com a barra, a corda ou o pegador.', 'Suba os braços à frente até a altura dos ombros, cotovelos levemente flexionados.', 'Desça devagar, sem deixar o peso bater.'],
  array['elevação frontal na polia', 'elevação frontal polia', 'elevação frontal no cabo', 'elevação frontal no cross', 'cable front raise'],
  'manual', padrao_movimento, articulacoes, tipo_movimento,
  array['Balançar o tronco para subir.', 'Subir acima da linha dos ombros.', 'Soltar o peso na descida.'],
  campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, 'treinador',
  'youtube', 'Tog1W44Otc4', 'https://i.ytimg.com/vi/Tog1W44Otc4/hqdefault.jpg', true
from exercicios_biblioteca where slug = 'elevacao-frontal-halteres'
on conflict (slug) do update set video_provider = 'youtube', video_id = 'Tog1W44Otc4',
  thumbnail_url = 'https://i.ytimg.com/vi/Tog1W44Otc4/hqdefault.jpg', video_validado = true
  where exercicios_biblioteca.video_id is distinct from 'Tog1W44Otc4';
