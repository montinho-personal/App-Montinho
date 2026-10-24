-- ============================================================================
-- 0090 — Vídeo enviado pelo personal (YouTube Shorts, validado por ele) para a
-- “Remada sentada na polia pegada supinada” (ficha do Denis). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = '9JY2jPQbPmI',
    thumbnail_url = 'https://i.ytimg.com/vi/9JY2jPQbPmI/hqdefault.jpg', video_validado = true
where slug = 'remada-sentada-na-polia-pegada-supinada' and video_id is distinct from '9JY2jPQbPmI';
