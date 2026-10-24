-- ============================================================================
-- 0089 — Vídeo enviado pelo personal (YouTube, validado por ele) para a
-- “Remada com halteres apoiada no banco inclinado” (fichas do Denis e do
-- Leonardo). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'kM3vQJ5afpM',
    thumbnail_url = 'https://i.ytimg.com/vi/kM3vQJ5afpM/hqdefault.jpg', video_validado = true
where slug = 'remada-apoiada-banco' and video_id is distinct from 'kM3vQJ5afpM';
