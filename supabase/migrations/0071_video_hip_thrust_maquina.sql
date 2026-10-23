-- ============================================================================
-- 0071 — Vídeo do hip thrust na máquina enviado pelo personal (YouTube Shorts,
-- já validado por ele) + sinônimo “reptrust na máquina” (como ele escreve). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'm8g9VogoxMo',
    thumbnail_url = 'https://i.ytimg.com/vi/m8g9VogoxMo/hqdefault.jpg', video_validado = true
where slug = 'hip-thrust-maquina' and video_id is distinct from 'm8g9VogoxMo';

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(sinonimos || array['hip thrust máquina', 'reptrust na máquina']))
where slug = 'hip-thrust-maquina' and not (sinonimos @> array['reptrust na máquina']);
