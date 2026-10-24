-- ============================================================================
-- 0086 — Strava: o aluno conecta a conta dele e, ao terminar o treino, o app
-- busca a atividade do relógio (batimento médio/máximo, duração, calorias).
-- • strava_conexoes: as chaves (tokens) da conexão. SÓ o próprio aluno lê,
--   grava e apaga (o personal nunca vê as chaves). Consentimento explícito
--   (dado de saúde, LGPD art. 11): consentido_em obrigatório.
-- • sessao_cardio: o resumo do relógio ligado ao treino. O aluno lê/grava
--   os dele; o personal lê de todos (acompanhamento). Uma linha por sessão.
-- Desconectar apaga a conexão; os resumos já importados ficam (são do treino).
-- ============================================================================
create table if not exists strava_conexoes (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  athlete_id bigint not null,
  atleta_nome text,
  access_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  escopo text,
  consentido_em timestamptz not null,
  conectado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table strava_conexoes enable row level security;
drop policy if exists strava_aluno on strava_conexoes;
create policy strava_aluno on strava_conexoes for all
  using (aluno_id = (select public.aluno_id_atual()))
  with check (aluno_id = (select public.aluno_id_atual()));

create table if not exists sessao_cardio (
  session_id uuid primary key references training_sessions(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  fonte text not null default 'strava' check (fonte in ('strava')),
  atividade_id bigint not null,
  nome_atividade text,
  dispositivo text,
  fc_media numeric(5,1),
  fc_max numeric(5,1),
  duracao_seg integer,
  calorias integer,
  inicio_atividade timestamptz,
  importado_em timestamptz not null default now()
);
create index if not exists sessao_cardio_aluno on sessao_cardio (aluno_id, inicio_atividade desc);
alter table sessao_cardio enable row level security;
drop policy if exists cardio_aluno on sessao_cardio;
create policy cardio_aluno on sessao_cardio for all
  using (aluno_id = (select public.aluno_id_atual()))
  with check (aluno_id = (select public.aluno_id_atual()) and exists (select 1 from training_sessions s where s.id = session_id and s.aluno_id = sessao_cardio.aluno_id));
drop policy if exists cardio_treinador_le on sessao_cardio;
create policy cardio_treinador_le on sessao_cardio for select using ((select public.is_treinador()));
