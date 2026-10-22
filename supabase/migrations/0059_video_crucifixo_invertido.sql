-- ============================================================================
-- 0059 — Vídeo enviado pelo personal (YouTube Shorts, já validado por ele):
-- crucifixo invertido com halteres (ficha da Natália). Idempotente.
-- ============================================================================
update exercicios_biblioteca set video_provider = 'youtube', video_id = 'TSaVAPzsbuU', video_validado = true
where slug = 'crucifixo-invertido-halteres' and video_id is distinct from 'TSaVAPzsbuU';
