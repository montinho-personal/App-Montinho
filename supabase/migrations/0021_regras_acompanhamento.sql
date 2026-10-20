-- ============================================================================
-- 0021 — Regras dos sinais/sugestões de acompanhamento ajustáveis pelo
-- personal (dias sem treino, queda de aderência, retomada, sequência,
-- treino aberto, plano alterado). Vazio = padrões do app.
-- RLS: já coberta pela policy de preferencias_treinador (só o próprio).
-- ============================================================================
alter table preferencias_treinador add column if not exists regras_acompanhamento jsonb not null default '{}'::jsonb;
