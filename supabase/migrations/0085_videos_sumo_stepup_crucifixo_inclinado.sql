-- ============================================================================
-- 0085 — Vídeos enviados pelo personal (YouTube Shorts, já validados por ele)
-- para os 3 exercícios da ficha da Ana que ainda não tinham vídeo, com os
-- nomes que ele usa como sinônimos. Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'uXsHFdEiMH8',
    thumbnail_url = 'https://i.ytimg.com/vi/uXsHFdEiMH8/hqdefault.jpg', video_validado = true
where slug = 'agachamento-sumo' and video_id is distinct from 'uXsHFdEiMH8';

update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'VQ3idU0WSWg',
    thumbnail_url = 'https://i.ytimg.com/vi/VQ3idU0WSWg/hqdefault.jpg', video_validado = true
where slug = 'subida-no-banco' and video_id is distinct from 'VQ3idU0WSWg';

update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'ZoemgdM-sIs',
    thumbnail_url = 'https://i.ytimg.com/vi/ZoemgdM-sIs/hqdefault.jpg', video_validado = true
where slug = 'crucifixo-inclinado-halteres' and video_id is distinct from 'ZoemgdM-sIs';

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(sinonimos || array['agachamento sumô com halteres', 'sumô com halteres']))
where slug = 'agachamento-sumo' and not (sinonimos @> array['agachamento sumô com halteres']);

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(sinonimos || array['step up com halteres', 'step-up com halteres']))
where slug = 'subida-no-banco' and not (sinonimos @> array['step up com halteres']);
