-- ============================================================================
-- 0082 — HYROX: “Desenvolvimento com kettlebell (strict press)”, cadastro do personal
-- como exercício de HYROX, com o vídeo que ele enviou (YouTube Shorts, já
-- validado por ele). E o sinônimo “hyrox” nos exercícios de HYROX (0081 +
-- caminhada do fazendeiro), para a busca “hyrox” listar todos. Idempotente.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, thumbnail_url, video_validado)
values (
  'c3f1a7d2-6b84-4e19-9a5c-2d7e0b8f4a63', 'Desenvolvimento com kettlebell (strict press)', 'kettlebell-strict-press', 'ombro_anterior', '{triceps,ombro_lateral,core}', '{kettlebell}',
  array['Kettlebell apoiado no antebraço, na altura do ombro, punho reto e cotovelo junto ao corpo.', 'Contraia glúteo e abdômen e empurre o kettlebell para cima até estender o braço, sem dobrar os joelhos (estrito, sem impulso das pernas).', 'Desça devagar até a posição inicial e repita; depois troque de lado.'],
  array['kettlebell strict press', 'strict press', 'desenvolvimento kettlebell', 'desenvolvimento com kettlebell', 'kb press', 'hyrox'],
  'manual', 'empurrar_vertical', array['ombro', 'cotovelo', 'escapula'], 'multiarticular',
  array['Usar as pernas para dar impulso.', 'Arquear a lombar para empurrar o peso.', 'Punho dobrado para trás com o kettlebell.'],
  array['carga', 'repeticoes'], '{"triceps":0.5,"ombro_lateral":0.25,"core":0.25}'::jsonb, array['ombro'], 'intermediario', true, 'treinador',
  'youtube', '6SDJvE7uHAo', 'https://i.ytimg.com/vi/6SDJvE7uHAo/hqdefault.jpg', true
)
on conflict (slug) do nothing;

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(sinonimos || array['hyrox']))
where slug in ('sled-push', 'sled-pull', 'corda-naval', 'remo-ergometro', 'thruster', 'caminhada-fazendeiro') and not (sinonimos @> array['hyrox']);

-- Vídeo da corda naval (battle rope) enviado pelo personal (YouTube Shorts, já validado por ele).
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'ZEAqK0lXnb0',
    thumbnail_url = 'https://i.ytimg.com/vi/ZEAqK0lXnb0/hqdefault.jpg', video_validado = true
where slug = 'corda-naval' and video_id is distinct from 'ZEAqK0lXnb0';

-- Vídeo da caminhada do fazendeiro (farmers carry) enviado pelo personal (YouTube Shorts, já validado por ele).
update exercicios_biblioteca
set video_provider = 'youtube', video_id = '1uOs1hP3u4A',
    thumbnail_url = 'https://i.ytimg.com/vi/1uOs1hP3u4A/hqdefault.jpg', video_validado = true
where slug = 'caminhada-fazendeiro' and video_id is distinct from '1uOs1hP3u4A';

-- Vídeos da passada andando (walking lunges) e do empurrar o trenó (sled push), enviados pelo personal.
update exercicios_biblioteca
set video_provider = 'youtube', video_id = '2ea3_b9rFdM',
    thumbnail_url = 'https://i.ytimg.com/vi/2ea3_b9rFdM/hqdefault.jpg', video_validado = true
where slug = 'passada-andando' and video_id is distinct from '2ea3_b9rFdM';

update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'e7-4Z3TSrhQ',
    thumbnail_url = 'https://i.ytimg.com/vi/e7-4Z3TSrhQ/hqdefault.jpg', video_validado = true
where slug = 'sled-push' and video_id is distinct from 'e7-4Z3TSrhQ';

-- Vídeos do puxar o trenó (sled pull), remo ergômetro (rower) e thruster (ram thrusters), enviados pelo personal.
update exercicios_biblioteca set video_provider = 'youtube', video_id = 'UFBoWh4GFgQ', thumbnail_url = 'https://i.ytimg.com/vi/UFBoWh4GFgQ/hqdefault.jpg', video_validado = true
where slug = 'sled-pull' and video_id is distinct from 'UFBoWh4GFgQ';
update exercicios_biblioteca set video_provider = 'youtube', video_id = 'soveq2xBNpo', thumbnail_url = 'https://i.ytimg.com/vi/soveq2xBNpo/hqdefault.jpg', video_validado = true
where slug = 'remo-ergometro' and video_id is distinct from 'soveq2xBNpo';
update exercicios_biblioteca set video_provider = 'youtube', video_id = 'E6_KMuR87p0', thumbnail_url = 'https://i.ytimg.com/vi/E6_KMuR87p0/hqdefault.jpg', video_validado = true
where slug = 'thruster' and video_id is distinct from 'E6_KMuR87p0';
