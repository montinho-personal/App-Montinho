-- ============================================================================
-- 0091 — Vídeo enviado pelo personal (YouTube Shorts, validado por ele) para a
-- “Rosca inversa na polia com barra W” (ficha do Denis). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'b57Wyr7c1Xk',
    thumbnail_url = 'https://i.ytimg.com/vi/b57Wyr7c1Xk/hqdefault.jpg', video_validado = true
where slug = 'rosca-inversa-na-polia-com-barra-w' and video_id is distinct from 'b57Wyr7c1Xk';
