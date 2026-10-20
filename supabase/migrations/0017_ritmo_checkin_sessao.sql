-- ============================================================================
-- 0017 — Ritmo do treino, check-in antes do treino e modo da sessão
-- * treinos.tempos_efetivos: parâmetros de tempo no momento do salvamento
--   (padrão do treinador + ajustes do treino), legíveis pelo aluno.
-- * training_sessions: tempo estimado (congelado no início), pausas, check-in
--   pré-treino e modo (normal / reduzido por tempo disponível / extra).
-- Aditiva: sessões antigas ficam com os valores padrão.
-- ============================================================================

alter table treinos add column if not exists tempos_efetivos jsonb;

alter table training_sessions add column if not exists tempo_estimado_seg integer
  check (tempo_estimado_seg is null or tempo_estimado_seg between 0 and 36000);
alter table training_sessions add column if not exists pausado_seg integer not null default 0
  check (pausado_seg between 0 and 36000);
alter table training_sessions add column if not exists checkin_pre text
  check (checkin_pre is null or checkin_pre in ('muito_bem','normal','cansado','desconforto','prefiro_nao'));
alter table training_sessions add column if not exists checkin_pre_nota text
  check (checkin_pre_nota is null or length(checkin_pre_nota) <= 300);
alter table training_sessions add column if not exists modo text not null default 'normal'
  check (modo in ('normal','reduzido','extra'));
alter table training_sessions add column if not exists tempo_disponivel_min integer
  check (tempo_disponivel_min is null or tempo_disponivel_min between 5 and 300);
