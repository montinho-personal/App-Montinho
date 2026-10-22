-- ============================================================================
-- 0069 — Vídeos enviados pelo personal (YouTube Shorts, já validados por ele):
-- supino inclinado na máquina (“supino máquina 45°”, + sinônimo) e barra fixa
-- pronada (ficha do Leo). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'lk6sql0-sZI',
    thumbnail_url = 'https://i.ytimg.com/vi/lk6sql0-sZI/hqdefault.jpg', video_validado = true
where slug = 'supino-inclinado-maquina' and video_id is distinct from 'lk6sql0-sZI';

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(sinonimos || array['supino máquina 45', 'supino máquina 45°']))
where slug = 'supino-inclinado-maquina' and not (sinonimos @> array['supino máquina 45']);

update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'Uyn3uxEgYvI',
    thumbnail_url = 'https://i.ytimg.com/vi/Uyn3uxEgYvI/hqdefault.jpg', video_validado = true
where slug = 'barra-fixa-pronada' and video_id is distinct from 'Uyn3uxEgYvI';
