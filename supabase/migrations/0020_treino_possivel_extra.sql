-- ============================================================================
-- 0020 — Flexibilidade: “meu treino possível hoje” e treino extra.
-- * exercicios.prioridade: essencial (nunca sai) | normal | adiavel (sai
--   primeiro quando falta tempo). Só vale com programas.permite_versao_reduzida.
-- * config_extra: regras do personal por aluno (habilitado, aprovação manual,
--   limite por semana, dias, limite de séries extras, intervalo mínimo).
-- * extras_liberados: sessões extras pré-aprovadas (modalidade, duração, grupos).
-- * solicitacoes_extra: pedidos do aluno; só o personal aprova ou recusa.
-- * training_sessions.extra_id: de qual extra liberado veio a sessão.
-- RLS: treinador lê e escreve; aluno lê os próprios e só CRIA pedido pendente.
-- ============================================================================

alter table exercicios add column if not exists prioridade text not null default 'normal';
do $$ begin
  alter table exercicios add constraint exercicios_prioridade_check check (prioridade in ('essencial','normal','adiavel'));
exception when duplicate_object then null; end $$;

create table if not exists config_extra (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  habilitado boolean not null default false,
  requer_aprovacao boolean not null default true,
  max_por_semana integer not null default 1 check (max_por_semana between 0 and 7),
  dias_permitidos smallint[] not null default '{0,1,2,3,4,5,6}',
  limite_series_semana integer not null default 12 check (limite_series_semana between 0 and 60),
  intervalo_min_horas integer not null default 12 check (intervalo_min_horas between 0 and 72),
  observacao text check (observacao is null or length(observacao) <= 300),
  atualizado_por uuid references profiles(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists extras_liberados (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  modalidade text not null check (modalidade in ('cardio_leve','cardio_moderado','tecnica','mobilidade','atividade_geral','complementar','resistido')),
  titulo text not null check (length(titulo) between 1 and 80),
  descricao text check (descricao is null or length(descricao) <= 600),
  duracao_min integer not null check (duracao_min between 5 and 180),
  treino_id uuid references treinos(id) on delete set null,
  grupos text[] not null default '{}',
  series_estimadas integer not null default 0 check (series_estimadas between 0 and 40),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_extras_liberados_aluno on extras_liberados(aluno_id) where ativo;

create table if not exists solicitacoes_extra (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  extra_id uuid not null references extras_liberados(id) on delete cascade,
  client_key text not null check (length(client_key) between 8 and 80),
  data date not null,
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada')),
  classificacao text not null check (classificacao in ('liberado','aprovacao','nao_recomendado')),
  motivos jsonb not null default '[]'::jsonb,
  recuperacao text check (recuperacao is null or recuperacao in ('bem','cansado','dor','prefiro_nao')),
  tempo_disponivel_min integer check (tempo_disponivel_min is null or tempo_disponivel_min between 5 and 300),
  mensagem_aluno text check (mensagem_aluno is null or length(mensagem_aluno) <= 300),
  resposta text check (resposta is null or length(resposta) <= 300),
  decidido_por uuid references profiles(id) on delete set null,
  decidido_em timestamptz,
  created_at timestamptz not null default now(),
  unique (aluno_id, client_key)
);
create index if not exists idx_solicitacoes_extra on solicitacoes_extra(status, created_at desc);

alter table training_sessions add column if not exists extra_id uuid references extras_liberados(id) on delete set null;

alter table config_extra enable row level security;
alter table extras_liberados enable row level security;
alter table solicitacoes_extra enable row level security;

drop policy if exists config_extra_treinador on config_extra;
create policy config_extra_treinador on config_extra for all using (public.is_treinador()) with check (public.is_treinador());
drop policy if exists config_extra_aluno_le on config_extra;
create policy config_extra_aluno_le on config_extra for select using (aluno_id = public.aluno_id_atual());

drop policy if exists extras_liberados_treinador on extras_liberados;
create policy extras_liberados_treinador on extras_liberados for all using (public.is_treinador()) with check (public.is_treinador());
drop policy if exists extras_liberados_aluno_le on extras_liberados;
create policy extras_liberados_aluno_le on extras_liberados for select using (aluno_id = public.aluno_id_atual());

drop policy if exists solicitacoes_extra_treinador on solicitacoes_extra;
create policy solicitacoes_extra_treinador on solicitacoes_extra for all using (public.is_treinador()) with check (public.is_treinador());
drop policy if exists solicitacoes_extra_aluno_le on solicitacoes_extra;
create policy solicitacoes_extra_aluno_le on solicitacoes_extra for select using (aluno_id = public.aluno_id_atual());
drop policy if exists solicitacoes_extra_aluno_cria on solicitacoes_extra;
create policy solicitacoes_extra_aluno_cria on solicitacoes_extra for insert with check (
  aluno_id = public.aluno_id_atual() and status = 'pendente' and resposta is null and decidido_por is null and decidido_em is null
  and exists (select 1 from extras_liberados x where x.id = extra_id and x.aluno_id = public.aluno_id_atual())
);
