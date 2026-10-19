-- ============================================================================
-- Montinho Personal Trainer — Fundação de sessões, versões e memória (0009)
-- ============================================================================
-- Objetivos (ver ARQUITETURA.md):
--   1. Separar PLANO PRESCRITO (treinos/exercicios, versionado) de SESSÃO
--      REALIZADA (training_sessions/session_exercises/session_sets) e de
--      HISTÓRICO PERMANENTE (programa_versoes + sessões imutáveis).
--   2. Nunca mais apagar exercícios com histórico: soft delete (removido_em).
--   3. Um aluno pode fazer o mesmo exercício duas vezes no mesmo dia; a chave
--      de idempotência é (aluno_id, client_key) na sessão e
--      (session_id, client_key) na série.
--   4. Metadados de volume por exercício (grupo resolvido, confiança, origem,
--      séries de aquecimento, técnica) e configuração do programa (frequência
--      por letra, metas de volume, prioridades).
--   5. Memória de prescrições DESIDENTIFICADA (biblioteca_programas).
--   6. Migrar o logbook legado para sessões SEM apagar a tabela logbook.
-- Tudo aditivo e idempotente (IF NOT EXISTS / DO blocks).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helpers de segurança: search_path explícito nas funções SECURITY DEFINER
-- ---------------------------------------------------------------------------
create or replace function public.is_treinador()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'treinador'
  );
$$;

create or replace function public.aluno_id_atual()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.alunos where profile_id = auth.uid();
$$;

-- Normalização de nomes de exercício (sem acento, minúsculo, espaços únicos).
-- Usada para histórico resistente à troca de exercício e para correções de grupo.
create or replace function public.normalizar_nome(txt text)
returns text
language sql immutable
as $$
  select regexp_replace(
    lower(translate(coalesce(txt, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
    '\s+', ' ', 'g');
$$;

-- ---------------------------------------------------------------------------
-- 1. exercicios — metadados de volume + soft delete + ids estáveis
-- ---------------------------------------------------------------------------
alter table exercicios add column if not exists grupo_muscular grupo_muscular;
alter table exercicios add column if not exists grupos_secundarios grupo_muscular[] not null default '{}';
alter table exercicios add column if not exists grupo_origem text
  check (grupo_origem in ('biblioteca', 'manual', 'heuristica', 'correcao'));
alter table exercicios add column if not exists grupo_confianca text
  check (grupo_confianca in ('alta', 'media', 'baixa'));
alter table exercicios add column if not exists series_aquecimento integer not null default 0
  check (series_aquecimento >= 0 and series_aquecimento <= 10);
alter table exercicios add column if not exists tecnica text not null default 'normal'
  check (tecnica in ('normal','superset','biset','dropset','rest_pause','cluster','piramide','isometria','unilateral'));
alter table exercicios add column if not exists bloco text;            -- agrupa superset/biset
alter table exercicios add column if not exists unilateral boolean not null default false;
alter table exercicios add column if not exists carga_alvo text;
alter table exercicios add column if not exists rir integer check (rir between 0 and 10);
alter table exercicios add column if not exists cadencia text;
alter table exercicios add column if not exists conta_volume boolean not null default true; -- cardio/mobilidade = false
alter table exercicios add column if not exists removido_em timestamptz;  -- soft delete
alter table exercicios add column if not exists updated_at timestamptz not null default now();

do $$ begin
  create trigger trg_exercicios_updated before update on exercicios
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

create index if not exists idx_exercicios_treino_ativos
  on exercicios(treino_id, ordem) where removido_em is null;

alter table treinos add column if not exists versao integer not null default 1;
alter table treinos add column if not exists programa_id uuid;
alter table treinos add column if not exists duracao_estimada_min integer;

-- ---------------------------------------------------------------------------
-- 2. exercicios_biblioteca — sinônimos e confiança da classificação
-- ---------------------------------------------------------------------------
alter table exercicios_biblioteca add column if not exists sinonimos text[] not null default '{}';
alter table exercicios_biblioteca add column if not exists fonte_classificacao text not null default 'manual'
  check (fonte_classificacao in ('manual','importado','heuristica'));
alter table exercicios_biblioteca add column if not exists video_validado boolean not null default false;
alter table exercicios_biblioteca add column if not exists nome_normalizado text
  generated always as (public.normalizar_nome(nome)) stored;
create index if not exists idx_biblioteca_nome_norm on exercicios_biblioteca(nome_normalizado);

-- Correções de classificação feitas pelo treinador: conhecimento reutilizável.
create table if not exists grupo_correcoes (
  nome_normalizado text primary key,
  grupo_muscular grupo_muscular not null,
  grupos_secundarios grupo_muscular[] not null default '{}',
  autor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$ begin
  create trigger trg_grupo_correcoes_updated before update on grupo_correcoes
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 3. programas — configuração do programa ativo do aluno
-- ---------------------------------------------------------------------------
create table if not exists programas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  nome text not null default 'Programa atual',
  objetivo text,                       -- hipertrofia | forca | emagrecimento | condicionamento | outro
  nivel text,                          -- iniciante | intermediario | avancado
  split text,                          -- ABC, Upper/Lower, PPL, Full Body, personalizado
  modo_semana text not null default 'fixa' check (modo_semana in ('fixa','rotativo')),
  -- Frequência planejada por letra dentro da semana/ciclo: {"A":2,"B":2,"C":1}
  frequencia jsonb not null default '{}'::jsonb,
  -- Semana fixa: [{"dia":1,"letra":"A"},...]; rotativo: {"sequencia":["A","B","C"],"dias_por_semana":5}
  calendario jsonb not null default '{}'::jsonb,
  -- Metas de volume por grupo (séries válidas/semana): {"gluteo":{"min":10,"max":16}}
  metas_volume jsonb not null default '{}'::jsonb,
  prioridades text[] not null default '{}',
  equipamentos text[] not null default '{}',
  duracao_min integer,
  permite_versao_reduzida boolean not null default false,  -- "hoje tenho só 30 min"
  observacoes text,
  versao integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_programas_aluno_ativo on programas(aluno_id) where ativo;
do $$ begin
  create trigger trg_programas_updated before update on programas
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  alter table treinos add constraint treinos_programa_fk
    foreign key (programa_id) references programas(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 4. programa_versoes — snapshots imutáveis (histórico do plano)
-- ---------------------------------------------------------------------------
create table if not exists programa_versoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  programa_id uuid references programas(id) on delete set null,
  versao integer not null,
  autor_id uuid references profiles(id) on delete set null,
  motivo text,
  snapshot jsonb not null,     -- {programa:{...}, treinos:[{id,letra,nome,exercicios:[...]}]}
  volume jsonb,                -- tabela de volume calculada no momento do salvamento
  diff_resumo text,            -- texto curto: "+1 exercício em B, séries de glúteo 10→12"
  created_at timestamptz not null default now()
);
create index if not exists idx_programa_versoes_aluno on programa_versoes(aluno_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Sessões realizadas
-- ---------------------------------------------------------------------------
do $$ begin
  create type sessao_status as enum ('em_andamento', 'concluida', 'abandonada');
exception when duplicate_object then null; end $$;

create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  treino_id uuid references treinos(id) on delete set null,
  programa_versao_id uuid references programa_versoes(id) on delete set null,
  letra treino_letra,
  nome_treino text,
  client_key text not null,                     -- idempotência (gerado no dispositivo)
  status sessao_status not null default 'em_andamento',
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  duracao_seg integer,
  snapshot jsonb not null default '{}'::jsonb,  -- prescrição no momento (imutável)
  series_planejadas integer not null default 0,
  series_concluidas integer not null default 0,
  feedback_percepcao text check (feedback_percepcao in ('leve','ok','pesado','dor')),
  feedback_comentario text,
  origem text not null default 'app' check (origem in ('app','legado_logbook','treinador')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (aluno_id, client_key)
);
create index if not exists idx_sessions_aluno_data on training_sessions(aluno_id, iniciado_em desc);
create index if not exists idx_sessions_status on training_sessions(aluno_id, status);
do $$ begin
  create trigger trg_sessions_updated before update on training_sessions
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  exercicio_id uuid references exercicios(id) on delete set null,
  biblioteca_id uuid references exercicios_biblioteca(id) on delete set null,
  client_key text not null,
  ordem integer not null default 0,
  nome text not null,
  nome_normalizado text generated always as (public.normalizar_nome(nome)) stored,
  grupo_muscular grupo_muscular,
  series_planejadas integer not null default 0,
  prescricao jsonb not null default '{}'::jsonb,
  status text not null default 'pendente'
    check (status in ('pendente','concluido','pulado','nao_consegui')),
  observacao_aluno text,
  created_at timestamptz not null default now(),
  unique (session_id, client_key)
);
create index if not exists idx_session_ex_session on session_exercises(session_id, ordem);
create index if not exists idx_session_ex_nome on session_exercises(nome_normalizado);
create index if not exists idx_session_ex_exercicio on session_exercises(exercicio_id);

create table if not exists session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  session_exercise_id uuid not null references session_exercises(id) on delete cascade,
  client_key text not null,
  serie integer not null check (serie >= 1 and serie <= 50),
  tipo text not null default 'valida'
    check (tipo in ('valida','aquecimento','dropset','rest_pause','cluster','isometria')),
  carga_kg numeric(6,2) check (carga_kg is null or carga_kg >= 0),
  reps integer check (reps is null or (reps >= 0 and reps <= 500)),
  rir integer check (rir is null or (rir between 0 and 10)),
  rpe numeric(3,1) check (rpe is null or (rpe between 0 and 10)),
  tempo_seg integer check (tempo_seg is null or tempo_seg >= 0),
  lado text check (lado is null or lado in ('direito','esquerdo','ambos')),
  desconforto integer check (desconforto is null or desconforto between 0 and 10),
  observacoes text,
  concluida_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, client_key)
);
create index if not exists idx_session_sets_exercise on session_sets(session_exercise_id, serie);
create index if not exists idx_session_sets_session on session_sets(session_id);

-- ---------------------------------------------------------------------------
-- 6. Pedidos de adaptação do aluno e intervenções do treinador
-- ---------------------------------------------------------------------------
create table if not exists adaptacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  session_id uuid references training_sessions(id) on delete set null,
  session_exercise_id uuid references session_exercises(id) on delete set null,
  exercicio_id uuid references exercicios(id) on delete set null,
  exercicio_nome text,
  motivo text not null check (motivo in ('nao_consegui','desconforto','sem_equipamento','sem_tempo','outro')),
  descricao text,
  status text not null default 'aberta' check (status in ('aberta','respondida','resolvida')),
  resposta text,
  respondido_por uuid references profiles(id) on delete set null,
  respondido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_adaptacoes_aluno on adaptacoes(aluno_id, created_at desc);
create index if not exists idx_adaptacoes_abertas on adaptacoes(status) where status = 'aberta';

create table if not exists intervencoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  tipo text not null check (tipo in ('nota','revisao_treino','ajuste_programa','mensagem','decisao','resposta_adaptacao')),
  titulo text,
  descricao text not null,
  referencia jsonb not null default '{}'::jsonb,  -- ids relacionados (versão, sessão, adaptação)
  visivel_aluno boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_intervencoes_aluno on intervencoes(aluno_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. Memória de prescrições — acervo desidentificado
-- ---------------------------------------------------------------------------
create table if not exists biblioteca_programas (
  id uuid primary key default gen_random_uuid(),
  origem_versao_id uuid references programa_versoes(id) on delete set null,
  hash_estrutura text not null,
  nome text not null,
  resumo text,
  metadados jsonb not null default '{}'::jsonb,
  estrutura jsonb not null,
  volume jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  status text not null default 'criado'
    check (status in ('criado','utilizado','revisado','favorito','arquivado')),
  favorito boolean not null default false,
  uso_count integer not null default 0,
  feedback jsonb not null default '{"util":0,"nao_util":0,"usei_adaptei":0}'::jsonb,
  justificativa text,
  autor_id uuid references profiles(id) on delete set null,
  excluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_biblioteca_programas_hash
  on biblioteca_programas(hash_estrutura) where excluido_em is null;
create index if not exists idx_biblioteca_programas_tags on biblioteca_programas using gin(tags);
create index if not exists idx_biblioteca_programas_meta on biblioteca_programas using gin(metadados);
create index if not exists idx_biblioteca_programas_fts on biblioteca_programas
  using gin(to_tsvector('portuguese', coalesce(nome,'') || ' ' || coalesce(resumo,'') || ' ' || coalesce(justificativa,'')));
do $$ begin
  create trigger trg_biblioteca_programas_updated before update on biblioteca_programas
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- Preferências do aluno (lembretes opt-in, horário silencioso) — sempre opt-in.
alter table alunos add column if not exists preferencias jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 8. Logbook legado → sessões (sem apagar nada)
-- ---------------------------------------------------------------------------
alter table logbook add column if not exists session_set_id uuid references session_sets(id) on delete set null;
-- O upsert antigo assumia esta chave única sem ela existir. Não criamos UNIQUE
-- (pode haver duplicatas reais); apenas índice de consulta. A API não usa mais upsert.
create index if not exists idx_logbook_chave on logbook(aluno_id, exercicio_id, data, serie);

-- 8.1 Uma sessão por (aluno, data, treino) — idempotente via client_key.
insert into training_sessions (aluno_id, treino_id, letra, nome_treino, client_key, status,
                               iniciado_em, finalizado_em, origem, snapshot)
select distinct
  l.aluno_id, e.treino_id, t.letra, t.nome,
  'legado:' || l.aluno_id || ':' || l.data || ':' || e.treino_id,
  'concluida'::sessao_status,
  l.data::timestamptz, l.data::timestamptz + interval '1 hour',
  'legado_logbook', jsonb_build_object('origem', 'logbook')
from logbook l
join exercicios e on e.id = l.exercicio_id
join treinos t on t.id = e.treino_id
where l.session_set_id is null
on conflict (aluno_id, client_key) do nothing;

-- 8.2 Exercícios da sessão (um por exercício prescrito que teve registro no dia).
insert into session_exercises (session_id, exercicio_id, client_key, ordem, nome, grupo_muscular, series_planejadas, status)
select distinct
  s.id, e.id, 'legado:' || e.id, e.ordem, e.nome, e.grupo_muscular, e.series, 'concluido'
from logbook l
join exercicios e on e.id = l.exercicio_id
join training_sessions s
  on s.aluno_id = l.aluno_id
 and s.client_key = 'legado:' || l.aluno_id || ':' || l.data || ':' || e.treino_id
where l.session_set_id is null
on conflict (session_id, client_key) do nothing;

-- 8.3 Séries (uma por linha do logbook).
insert into session_sets (session_id, session_exercise_id, client_key, serie, carga_kg, reps, rpe, observacoes, concluida_em)
select
  s.id, se.id, 'legado:' || l.id, l.serie, l.carga_kg, l.reps, l.ie, l.observacoes, l.created_at
from logbook l
join exercicios e on e.id = l.exercicio_id
join training_sessions s
  on s.aluno_id = l.aluno_id
 and s.client_key = 'legado:' || l.aluno_id || ':' || l.data || ':' || e.treino_id
join session_exercises se on se.session_id = s.id and se.client_key = 'legado:' || e.id
where l.session_set_id is null
on conflict (session_id, client_key) do nothing;

-- 8.4 Marca as linhas migradas (rastreabilidade, sem apagar).
update logbook l
set session_set_id = ss.id
from session_sets ss
where l.session_set_id is null and ss.client_key = 'legado:' || l.id;

-- 8.5 Totais das sessões legadas.
update training_sessions s set
  series_concluidas = (select count(*) from session_sets ss where ss.session_id = s.id and ss.tipo = 'valida'),
  series_planejadas = (select coalesce(sum(se.series_planejadas), 0) from session_exercises se where se.session_id = s.id)
where s.origem = 'legado_logbook';

-- ---------------------------------------------------------------------------
-- 9. RLS
-- ---------------------------------------------------------------------------
alter table grupo_correcoes enable row level security;
alter table programas enable row level security;
alter table programa_versoes enable row level security;
alter table training_sessions enable row level security;
alter table session_exercises enable row level security;
alter table session_sets enable row level security;
alter table adaptacoes enable row level security;
alter table intervencoes enable row level security;
alter table biblioteca_programas enable row level security;

-- grupo_correcoes: todos autenticados leem (o aluno precisa do grupo no app), só treinador escreve
drop policy if exists "Autenticado lê correções de grupo" on grupo_correcoes;
create policy "Autenticado lê correções de grupo"
  on grupo_correcoes for select using (auth.uid() is not null);
drop policy if exists "Treinador gerencia correções de grupo" on grupo_correcoes;
create policy "Treinador gerencia correções de grupo"
  on grupo_correcoes for all using (is_treinador()) with check (is_treinador());

-- programas / versões
drop policy if exists "Aluno lê próprio programa" on programas;
create policy "Aluno lê próprio programa"
  on programas for select using (aluno_id = aluno_id_atual() or is_treinador());
drop policy if exists "Treinador gerencia programas" on programas;
create policy "Treinador gerencia programas"
  on programas for all using (is_treinador()) with check (is_treinador());

drop policy if exists "Aluno lê próprias versões" on programa_versoes;
create policy "Aluno lê próprias versões"
  on programa_versoes for select using (aluno_id = aluno_id_atual() or is_treinador());
drop policy if exists "Treinador cria versões" on programa_versoes;
create policy "Treinador cria versões"
  on programa_versoes for insert with check (is_treinador());
-- Versões são imutáveis: sem update/delete via API.

-- training_sessions: aluno cria/lê/atualiza as SUAS; treinador lê e pode anotar
drop policy if exists "Aluno lê próprias sessões" on training_sessions;
create policy "Aluno lê próprias sessões"
  on training_sessions for select using (aluno_id = aluno_id_atual() or is_treinador());
drop policy if exists "Aluno cria própria sessão" on training_sessions;
create policy "Aluno cria própria sessão"
  on training_sessions for insert with check (aluno_id = aluno_id_atual());
drop policy if exists "Aluno atualiza própria sessão" on training_sessions;
create policy "Aluno atualiza própria sessão"
  on training_sessions for update using (aluno_id = aluno_id_atual()) with check (aluno_id = aluno_id_atual());
drop policy if exists "Treinador gerencia sessões" on training_sessions;
create policy "Treinador gerencia sessões"
  on training_sessions for all using (is_treinador()) with check (is_treinador());

-- session_exercises / session_sets: via dono da sessão
drop policy if exists "Aluno lê exercícios das próprias sessões" on session_exercises;
create policy "Aluno lê exercícios das próprias sessões"
  on session_exercises for select using (
    is_treinador() or exists (
      select 1 from training_sessions s where s.id = session_exercises.session_id and s.aluno_id = aluno_id_atual()
    )
  );
drop policy if exists "Aluno escreve exercícios das próprias sessões" on session_exercises;
create policy "Aluno escreve exercícios das próprias sessões"
  on session_exercises for insert with check (
    exists (select 1 from training_sessions s where s.id = session_exercises.session_id and s.aluno_id = aluno_id_atual())
  );
drop policy if exists "Aluno atualiza exercícios das próprias sessões" on session_exercises;
create policy "Aluno atualiza exercícios das próprias sessões"
  on session_exercises for update using (
    exists (select 1 from training_sessions s where s.id = session_exercises.session_id and s.aluno_id = aluno_id_atual())
  );
drop policy if exists "Treinador gerencia exercícios de sessão" on session_exercises;
create policy "Treinador gerencia exercícios de sessão"
  on session_exercises for all using (is_treinador()) with check (is_treinador());

drop policy if exists "Aluno lê próprias séries" on session_sets;
create policy "Aluno lê próprias séries"
  on session_sets for select using (
    is_treinador() or exists (
      select 1 from training_sessions s where s.id = session_sets.session_id and s.aluno_id = aluno_id_atual()
    )
  );
drop policy if exists "Aluno registra próprias séries" on session_sets;
create policy "Aluno registra próprias séries"
  on session_sets for insert with check (
    exists (select 1 from training_sessions s where s.id = session_sets.session_id and s.aluno_id = aluno_id_atual())
  );
drop policy if exists "Aluno corrige próprias séries" on session_sets;
create policy "Aluno corrige próprias séries"
  on session_sets for update using (
    exists (select 1 from training_sessions s where s.id = session_sets.session_id and s.aluno_id = aluno_id_atual())
  );
drop policy if exists "Aluno remove série da própria sessão em andamento" on session_sets;
create policy "Aluno remove série da própria sessão em andamento"
  on session_sets for delete using (
    exists (select 1 from training_sessions s where s.id = session_sets.session_id
            and s.aluno_id = aluno_id_atual() and s.status = 'em_andamento')
  );
drop policy if exists "Treinador gerencia séries" on session_sets;
create policy "Treinador gerencia séries"
  on session_sets for all using (is_treinador()) with check (is_treinador());

-- adaptações
drop policy if exists "Aluno lê próprias adaptações" on adaptacoes;
create policy "Aluno lê próprias adaptações"
  on adaptacoes for select using (aluno_id = aluno_id_atual() or is_treinador());
drop policy if exists "Aluno pede adaptação" on adaptacoes;
create policy "Aluno pede adaptação"
  on adaptacoes for insert with check (aluno_id = aluno_id_atual());
drop policy if exists "Treinador gerencia adaptações" on adaptacoes;
create policy "Treinador gerencia adaptações"
  on adaptacoes for all using (is_treinador()) with check (is_treinador());

-- intervenções: treinador escreve; aluno lê só as visíveis e suas
drop policy if exists "Aluno lê intervenções visíveis" on intervencoes;
create policy "Aluno lê intervenções visíveis"
  on intervencoes for select using (
    is_treinador() or (visivel_aluno and aluno_id = aluno_id_atual())
  );
drop policy if exists "Treinador gerencia intervenções" on intervencoes;
create policy "Treinador gerencia intervenções"
  on intervencoes for all using (is_treinador()) with check (is_treinador());

-- memória de prescrições: somente treinador
drop policy if exists "Treinador gerencia memória de programas" on biblioteca_programas;
create policy "Treinador gerencia memória de programas"
  on biblioteca_programas for all using (is_treinador()) with check (is_treinador());

-- ---------------------------------------------------------------------------
-- 10. Endurecimento de políticas existentes
-- ---------------------------------------------------------------------------
-- Aluno não pode mais escrever no logbook legado (só leitura); o app usa sessões.
drop policy if exists "Aluno escreve próprio logbook" on logbook;
drop policy if exists "Aluno atualiza próprio logbook" on logbook;

-- Templates: aluno nunca lê nem escreve (já era só treinador) — reforço explícito.
-- Storage: fotos continuam privadas (bucket fotos-evolucao, policies da 0002).
