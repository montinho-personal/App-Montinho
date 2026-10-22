-- ============================================================================
-- 0050 — Vídeos enviados pelo personal (YouTube, já validados por ele):
-- abdominal remador e panturrilha sentado. Idempotente.
-- ============================================================================
update exercicios_biblioteca set video_provider = 'youtube', video_id = '2ephPjg2CZs', video_validado = true
where slug = 'abdominal-remador' and video_id is distinct from '2ephPjg2CZs';
update exercicios_biblioteca set video_provider = 'youtube', video_id = '6eJ9EVwazXk', video_validado = true
where slug = 'panturrilha-sentado' and video_id is distinct from '6eJ9EVwazXk';
