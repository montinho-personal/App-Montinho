-- ============================================================================
-- 0093 — Vídeo enviado pelo personal (YouTube Shorts, validado por ele) para a
-- “Prancha lateral” (ficha da Brigida). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'SHmCd90Un9w',
    thumbnail_url = 'https://i.ytimg.com/vi/SHmCd90Un9w/hqdefault.jpg', video_validado = true
where slug = 'prancha-lateral' and video_id is distinct from 'SHmCd90Un9w';
