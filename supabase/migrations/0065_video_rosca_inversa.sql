-- ============================================================================
-- 0065 — Vídeo enviado pelo personal (YouTube Shorts, já validado por ele):
-- rosca inversa (pegada pronada), feita com barra reta (ficha da Naya), e os
-- nomes que o personal usa (“rosca inversa”, “rosca inversa na barra”). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'cIqScmVpqnc',
    thumbnail_url = 'https://i.ytimg.com/vi/cIqScmVpqnc/hqdefault.jpg', video_validado = true
where slug = 'rosca-inversa' and video_id is distinct from 'cIqScmVpqnc';

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(sinonimos || array['rosca inversa', 'rosca inversa na barra', 'rosca inversa barra reta']))
where slug = 'rosca-inversa' and not (sinonimos @> array['rosca inversa na barra']);
