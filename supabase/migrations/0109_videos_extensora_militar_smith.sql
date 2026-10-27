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

-- Vídeo do “Desenvolvimento no Smith” (o personal chama de “desenvolvimento na
-- barra guiada”; confirmado por ele em 28/10/2026 que é o do Smith, não o
-- landmine) + esse nome como sinônimo, para a busca achar.
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'm1dtZHPSmHg',
    thumbnail_url = 'https://i.ytimg.com/vi/m1dtZHPSmHg/hqdefault.jpg', video_validado = true
where slug = 'desenvolvimento-smith' and video_id is distinct from 'm1dtZHPSmHg';
update exercicios_biblioteca
set sinonimos = array_append(sinonimos, 'desenvolvimento na barra guiada')
where slug = 'desenvolvimento-smith' and not ('desenvolvimento na barra guiada' = any(sinonimos));
