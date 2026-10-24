-- ============================================================================
-- 0092 — Vídeo enviado pelo personal (YouTube, validado por ele) para o
-- “Abdominal infra (elevação de pernas deitado)” (ficha da Brigida) +
-- sinônimo “abdominal infra deitado”. Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'ixJcUH8AlL8',
    thumbnail_url = 'https://i.ytimg.com/vi/ixJcUH8AlL8/hqdefault.jpg', video_validado = true
where slug = 'abdominal-infra' and video_id is distinct from 'ixJcUH8AlL8';

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(sinonimos || array['abdominal infra deitado']))
where slug = 'abdominal-infra' and not (sinonimos @> array['abdominal infra deitado']);
