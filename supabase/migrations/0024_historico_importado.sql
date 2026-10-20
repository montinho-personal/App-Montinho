-- ============================================================================
-- 0024 — Histórico importado do app anterior (transcrito pelo personal).
-- * origem 'importado': sessões que não foram registradas no app.
-- * conta_aderencia: se false, a sessão entra em gráficos de carga, recordes e
--   evolução, mas NÃO em aderência, sequência de semanas e conquistas.
-- Nada existente muda: o padrão é true e as origens antigas continuam válidas.
-- ============================================================================
alter table training_sessions drop constraint if exists training_sessions_origem_check;
alter table training_sessions add constraint training_sessions_origem_check check (origem in ('app','legado_logbook','treinador','importado'));
alter table training_sessions add column if not exists conta_aderencia boolean not null default true;
