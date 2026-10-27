-- ============================================================================
-- 0109 — Vídeo enviado pelo personal (YouTube Shorts, validado por ele) para a
-- “Cadeira extensora unilateral” (28/10/2026). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'FyrO55GJtz4',
    thumbnail_url = 'https://i.ytimg.com/vi/FyrO55GJtz4/hqdefault.jpg', video_validado = true
where slug = 'cadeira-extensora-unilateral' and video_id is distinct from 'FyrO55GJtz4';

-- Vídeo do “Desenvolvimento militar em pé” (YouTube Shorts enviado pelo personal
-- em 28/10/2026, validado por ele).
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'F1NZ3MoNCvU',
    thumbnail_url = 'https://i.ytimg.com/vi/F1NZ3MoNCvU/hqdefault.jpg', video_validado = true
where slug = 'desenvolvimento-barra-em-pe' and video_id is distinct from 'F1NZ3MoNCvU';
