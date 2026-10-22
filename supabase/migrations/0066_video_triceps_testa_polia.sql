-- ============================================================================
-- 0066 — Vídeo enviado pelo personal em 21/10 (“tríceps testa”, YouTube) no
-- Tríceps testa na polia com barra reta (0062, ficha da Naya). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = '0CgcKneC1_k',
    thumbnail_url = 'https://i.ytimg.com/vi/0CgcKneC1_k/hqdefault.jpg', video_validado = true
where id = 'a3c51e7d-2b84-4f6a-9d10-7e2b5c8f4a62' and video_id is distinct from '0CgcKneC1_k';
