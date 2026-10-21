-- ============================================================================
-- 0046 — “Rosca direta no banco inclinado” (pedido do personal): é a mesma
-- “Rosca inclinada com halteres” da biblioteca. Em vez de duplicar (o que
-- dividiria histórico e volume), ganha o vídeo enviado pelo personal e os
-- nomes que ele usa como sinônimos de busca. Músculos sem mudança: bíceps.
-- Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'EWz-GD6UkVY', video_validado = true
where slug = 'rosca-inclinada-halteres' and video_id is distinct from 'EWz-GD6UkVY';

update exercicios_biblioteca
set sinonimos = array(select distinct unnest(sinonimos || array['rosca direta banco inclinado', 'rosca direta no banco inclinado', 'rosca direta inclinada', 'rosca no banco inclinado']))
where slug = 'rosca-inclinada-halteres' and not ('rosca direta banco inclinado' = any(sinonimos));
