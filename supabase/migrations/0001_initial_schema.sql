-- ============================================================================
-- Squad App — Initial Schema (Migration 0001)
-- ============================================================================
-- Cria as 8 tabelas core, enums, índices, RLS policies e triggers.
-- Aplicar no Supabase via: SQL Editor → cole este arquivo → Run.
-- ============================================================================

-- Extensões necessárias --------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Enums ----------------------------------------------------------------------
create type user_role as enum ('treinador', 'aluno');
create type aluno_status as enum ('ativo', 'pendente', 'inadimplente', 'pausado', 'arquivado');
create type pagamento_status as enum ('pendente', 'pago', 'atrasado', 'cancelado', 'falhou');
create type pagamento_metodo as enum ('pix', 'credito', 'debito', 'recorrente');
create type treino_letra as enum ('A', 'B', 'C', 'D', 'E');
create type sexo as enum ('M', 'F', 'NI');

-- =============================================================================
-- profiles — espelho de auth.users com role e dados de exibição
-- =============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text not null,
  role user_role not null default 'aluno',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);

-- =============================================================================
-- alunos — dados completos do aluno (1:1 com profile, só pra alunos)
-- =============================================================================
create table alunos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  telefone text,
  data_nascimento date,
  sexo sexo,
  altura_cm integer,
  objetivo text,
  observacoes text,
  status aluno_status not null default 'pendente',
  data_inicio date,
  acesso_ate date,
  ultimo_treino_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_alunos_status on alunos(status);
create index idx_alunos_acesso_ate on alunos(acesso_ate);

-- =============================================================================
-- treinos — cabeçalho de um treino (A/B/C/D/E)
-- =============================================================================
create table treinos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  letra treino_letra not null,
  nome text not null,
  observacoes text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(aluno_id, letra)
);

create index idx_treinos_aluno on treinos(aluno_id);

-- =============================================================================
-- exercicios — exercícios dentro de cada treino
-- formato: 10-12/8-10/6-8 (reps progressivas), IE 1-10
-- =============================================================================
create table exercicios (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references treinos(id) on delete cascade,
  ordem integer not null default 0,
  nome text not null,
  series integer not null default 3,
  reps text not null,
  ie integer check (ie between 1 and 10),
  descanso_seg integer,
  observacoes text,
  video_url text,
  created_at timestamptz not null default now()
);

create index idx_exercicios_treino on exercicios(treino_id, ordem);

-- =============================================================================
-- cronograma — qual treino em qual dia da semana
-- =============================================================================
create table cronograma (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  dia_semana integer not null check (dia_semana between 0 and 6),
  treino_id uuid references treinos(id) on delete set null,
  descanso boolean not null default false,
  unique(aluno_id, dia_semana)
);

-- =============================================================================
-- logbook — registro de cargas executadas pelo aluno
-- =============================================================================
create table logbook (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  exercicio_id uuid not null references exercicios(id) on delete cascade,
  data date not null default current_date,
  serie integer not null,
  carga_kg numeric(6, 2),
  reps integer,
  ie integer check (ie between 1 and 10),
  observacoes text,
  created_at timestamptz not null default now()
);

create index idx_logbook_aluno_data on logbook(aluno_id, data desc);
create index idx_logbook_exercicio on logbook(exercicio_id);

-- =============================================================================
-- evolucao — peso, medidas, % gordura no tempo
-- =============================================================================
create table evolucao (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  data date not null default current_date,
  peso_kg numeric(5, 2),
  gordura_pct numeric(4, 2),
  cintura_cm numeric(5, 2),
  quadril_cm numeric(5, 2),
  braco_cm numeric(5, 2),
  coxa_cm numeric(5, 2),
  peito_cm numeric(5, 2),
  observacoes text,
  created_at timestamptz not null default now()
);

create index idx_evolucao_aluno_data on evolucao(aluno_id, data desc);

-- =============================================================================
-- dieta — plano alimentar com refeições e substituições
-- =============================================================================
create table dieta (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  refeicao text not null,
  ordem integer not null default 0,
  horario time,
  alimentos jsonb not null default '[]'::jsonb,
  substituicoes jsonb not null default '[]'::jsonb,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dieta_aluno on dieta(aluno_id, ordem);

-- =============================================================================
-- fotos — fotos de evolução com timeline
-- =============================================================================
create table fotos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  data date not null default current_date,
  url text not null,
  tipo text check (tipo in ('frente', 'lado', 'costas', 'outro')),
  observacoes text,
  created_at timestamptz not null default now()
);

create index idx_fotos_aluno_data on fotos(aluno_id, data desc);

-- =============================================================================
-- pagamentos — registro de cobranças e pagamentos via InfinityPay
-- =============================================================================
create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  order_nsu text not null unique,
  invoice_slug text,
  transaction_nsu text,
  valor_centavos integer not null,
  metodo pagamento_metodo,
  status pagamento_status not null default 'pendente',
  checkout_url text,
  receipt_url text,
  vencimento date,
  pago_em timestamptz,
  raw_webhook jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pagamentos_aluno on pagamentos(aluno_id, vencimento desc);
create index idx_pagamentos_status on pagamentos(status);
create index idx_pagamentos_invoice on pagamentos(invoice_slug);

-- =============================================================================
-- Triggers — updated_at automático
-- =============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_alunos_updated before update on alunos
  for each row execute function set_updated_at();
create trigger trg_treinos_updated before update on treinos
  for each row execute function set_updated_at();
create trigger trg_dieta_updated before update on dieta
  for each row execute function set_updated_at();
create trigger trg_pagamentos_updated before update on pagamentos
  for each row execute function set_updated_at();

-- =============================================================================
-- Trigger — cria profile automaticamente quando user é criado em auth.users
-- =============================================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'aluno')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- Helper: is_treinador()
-- =============================================================================
create or replace function is_treinador()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'treinador'
  );
$$ language sql stable security definer;

create or replace function aluno_id_atual()
returns uuid as $$
  select id from alunos where profile_id = auth.uid();
$$ language sql stable security definer;

-- =============================================================================
-- RLS — habilitar em todas as tabelas
-- =============================================================================
alter table profiles enable row level security;
alter table alunos enable row level security;
alter table treinos enable row level security;
alter table exercicios enable row level security;
alter table cronograma enable row level security;
alter table logbook enable row level security;
alter table evolucao enable row level security;
alter table dieta enable row level security;
alter table fotos enable row level security;
alter table pagamentos enable row level security;

-- Policies — profiles -------------------------------------------------------
create policy "Usuário lê próprio profile"
  on profiles for select using (id = auth.uid() or is_treinador());

create policy "Usuário atualiza próprio profile"
  on profiles for update using (id = auth.uid());

create policy "Treinador atualiza qualquer profile"
  on profiles for update using (is_treinador());

-- Policies — alunos ---------------------------------------------------------
create policy "Aluno lê próprio cadastro"
  on alunos for select using (profile_id = auth.uid() or is_treinador());

create policy "Treinador faz tudo em alunos"
  on alunos for all using (is_treinador()) with check (is_treinador());

-- Policies — treinos / exercicios / cronograma ------------------------------
create policy "Aluno lê seus treinos"
  on treinos for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Treinador gerencia treinos"
  on treinos for all using (is_treinador()) with check (is_treinador());

create policy "Aluno lê exercícios dos seus treinos"
  on exercicios for select using (
    exists (select 1 from treinos t where t.id = exercicios.treino_id
      and (t.aluno_id = aluno_id_atual() or is_treinador()))
  );
create policy "Treinador gerencia exercícios"
  on exercicios for all using (is_treinador()) with check (is_treinador());

create policy "Aluno lê próprio cronograma"
  on cronograma for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Treinador gerencia cronograma"
  on cronograma for all using (is_treinador()) with check (is_treinador());

-- Policies — logbook (aluno escreve o próprio, treinador lê todos) ----------
create policy "Aluno lê próprio logbook"
  on logbook for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Aluno escreve próprio logbook"
  on logbook for insert with check (aluno_id = aluno_id_atual());
create policy "Aluno atualiza próprio logbook"
  on logbook for update using (aluno_id = aluno_id_atual());
create policy "Treinador escreve qualquer logbook"
  on logbook for all using (is_treinador()) with check (is_treinador());

-- Policies — evolucao -------------------------------------------------------
create policy "Aluno lê própria evolução"
  on evolucao for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Aluno escreve própria evolução"
  on evolucao for insert with check (aluno_id = aluno_id_atual());
create policy "Aluno atualiza própria evolução"
  on evolucao for update using (aluno_id = aluno_id_atual());
create policy "Treinador gerencia evolução"
  on evolucao for all using (is_treinador()) with check (is_treinador());

-- Policies — dieta ----------------------------------------------------------
create policy "Aluno lê própria dieta"
  on dieta for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Treinador gerencia dieta"
  on dieta for all using (is_treinador()) with check (is_treinador());

-- Policies — fotos ----------------------------------------------------------
create policy "Aluno lê próprias fotos"
  on fotos for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Aluno faz upload próprio"
  on fotos for insert with check (aluno_id = aluno_id_atual());
create policy "Aluno deleta próprias fotos"
  on fotos for delete using (aluno_id = aluno_id_atual());
create policy "Treinador gerencia fotos"
  on fotos for all using (is_treinador()) with check (is_treinador());

-- Policies — pagamentos (só treinador escreve; aluno lê os seus) ------------
create policy "Aluno lê próprios pagamentos"
  on pagamentos for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Treinador gerencia pagamentos"
  on pagamentos for all using (is_treinador()) with check (is_treinador());
