-- ============================================================================
-- 0126 — “Supino com pegada fechada” passa a se chamar “Supino fechado com a
-- barra” (pedido do personal em 30/10/2026), com o vídeo enviado e validado por
-- ele (YouTube Shorts). O nome antigo vira sinônimo, para a busca continuar
-- achando. Só a biblioteca muda: a ficha que já usa o exercício mantém o nome
-- dela (o histórico de evolução segue junto). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set nome = 'Supino fechado com a barra',
    sinonimos = (select array_agg(distinct s) from unnest(sinonimos || array['supino com pegada fechada', 'supino fechado com barra']) s),
    video_provider = 'youtube', video_id = 'OQVPDehGM-0',
    thumbnail_url = 'https://i.ytimg.com/vi/OQVPDehGM-0/hqdefault.jpg', video_validado = true
where slug = 'supino-fechado' and (nome <> 'Supino fechado com a barra' or video_id is distinct from 'OQVPDehGM-0');
