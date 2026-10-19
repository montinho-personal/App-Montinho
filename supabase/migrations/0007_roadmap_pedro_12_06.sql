-- ============================================================================
-- Roadmap Pedro 12/06 (Migration 0007)
-- ============================================================================
-- Séries detalhadas (pirâmide), finalizar/arquivar treino, formulários públicos
-- (anamnese→aluno + leads), importações, cálculo de dieta, integrações, marca.
-- ============================================================================
create extension if not exists "pgcrypto";

-- Permite finalizar/arquivar um treino A e criar outro A ativo depois.
alter table treinos drop constraint if exists treinos_aluno_id_letra_key;
create unique index if not exists idx_treinos_aluno_letra_ativo_unique
  on treinos(aluno_id, letra)
  where ativo;

-- Série a série (pirâmide) serializada por exercício.
alter table exercicios add column if not exists series_config jsonb;

do $$ begin
  create type squad_form_tipo as enum ('anamnese', 'lead');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type squad_lead_status as enum ('novo', 'em_contato', 'convertido', 'descartado');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type squad_import_tipo as enum ('videos', 'templates', 'logo', 'dieta', 'anamnese');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type squad_import_status as enum ('rascunho', 'processado', 'erro');
exception when duplicate_object then null;
end $$;

create table if not exists squad_public_forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  tipo squad_form_tipo not null,
  titulo text not null,
  descricao text,
  estrutura jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists squad_leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  origem text,
  status squad_lead_status not null default 'novo',
  objetivo text,
  categoria text,
  payload jsonb not null default '{}'::jsonb,
  convertido_aluno_id uuid references alunos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists squad_form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references squad_public_forms(id) on delete cascade,
  aluno_id uuid references alunos(id) on delete set null,
  lead_id uuid references squad_leads(id) on delete set null,
  nome text,
  email text,
  telefone text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists squad_import_jobs (
  id uuid primary key default gen_random_uuid(),
  tipo squad_import_tipo not null,
  status squad_import_status not null default 'rascunho',
  arquivo_nome text,
  raw_text text,
  payload jsonb not null default '{}'::jsonb,
  resultado jsonb,
  erro text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists squad_dieta_calculos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references alunos(id) on delete cascade,
  peso_kg numeric(6, 2) not null,
  proteina_g_por_kg numeric(4, 2) not null default 2.20,
  gordura_g_por_kg numeric(4, 2) not null default 0.50,
  calorias_alvo integer,
  metodo jsonb not null default '{}'::jsonb,
  resultado jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists squad_integracoes (
  id text primary key,
  nome text not null,
  status text not null default 'pendente',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists squad_brand_assets (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'logo',
  url text,
  observacoes text,
  ativo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_squad_leads_status_created on squad_leads(status, created_at desc);
create index if not exists idx_squad_public_forms_tipo on squad_public_forms(tipo, ativo);
create index if not exists idx_squad_import_jobs_tipo on squad_import_jobs(tipo, created_at desc);

alter table squad_public_forms enable row level security;
alter table squad_leads enable row level security;
alter table squad_form_responses enable row level security;
alter table squad_import_jobs enable row level security;
alter table squad_dieta_calculos enable row level security;
alter table squad_integracoes enable row level security;
alter table squad_brand_assets enable row level security;

create policy "Formularios publicos ativos podem ser lidos"
  on squad_public_forms for select using (ativo or is_treinador());
create policy "Treinador gerencia formularios"
  on squad_public_forms for all using (is_treinador()) with check (is_treinador());
create policy "Treinador gerencia leads"
  on squad_leads for all using (is_treinador()) with check (is_treinador());
create policy "Treinador le respostas"
  on squad_form_responses for select using (is_treinador());
create policy "Treinador gerencia respostas"
  on squad_form_responses for all using (is_treinador()) with check (is_treinador());
create policy "Treinador gerencia importacoes"
  on squad_import_jobs for all using (is_treinador()) with check (is_treinador());
create policy "Treinador gerencia calculos de dieta"
  on squad_dieta_calculos for all using (is_treinador()) with check (is_treinador());
create policy "Treinador gerencia integracoes"
  on squad_integracoes for all using (is_treinador()) with check (is_treinador());
create policy "Treinador gerencia marca"
  on squad_brand_assets for all using (is_treinador()) with check (is_treinador());

insert into squad_public_forms (slug, tipo, titulo, descricao, estrutura)
values
  (
    'squad-anamnese',
    'anamnese',
    'Anamnese Squad',
    'Formulario inicial para criar aluno automaticamente e alimentar o cartao de contexto.',
    '[
      {"name":"nome","label":"Nome completo","type":"text","required":true},
      {"name":"email","label":"E-mail","type":"email","required":true},
      {"name":"telefone","label":"WhatsApp","type":"tel","required":true},
      {"name":"idade","label":"Idade","type":"number"},
      {"name":"altura_cm","label":"Altura em cm","type":"number"},
      {"name":"peso_kg","label":"Peso atual em kg","type":"number"},
      {"name":"categoria","label":"Categoria / objetivo competitivo","type":"text"},
      {"name":"lesoes","label":"Lesoes","type":"textarea"},
      {"name":"dores_atuais","label":"Exercicios que causam incomodo","type":"textarea"},
      {"name":"dias_treino","label":"Dias da semana que treina","type":"text"},
      {"name":"estrutura_academia","label":"Estrutura da academia","type":"select","options":["Basica","Maquinas articuladas","Halter pesado","Completa"]},
      {"name":"treino_atual","label":"Descreva seu treino atual","type":"textarea"}
    ]'::jsonb
  ),
  (
    'squad-lead',
    'lead',
    'Qualificacao Squad',
    'Link de bio para captar interessados e colocar o lead dentro do sistema.',
    '[
      {"name":"nome","label":"Nome completo","type":"text","required":true},
      {"name":"telefone","label":"WhatsApp","type":"tel","required":true},
      {"name":"email","label":"E-mail","type":"email"},
      {"name":"objetivo","label":"Objetivo principal","type":"textarea","required":true},
      {"name":"categoria","label":"Categoria / modalidade","type":"text"},
      {"name":"prazo","label":"Tem data de campeonato ou meta?","type":"text"},
      {"name":"experiencia","label":"Ha quanto tempo treina?","type":"text"}
    ]'::jsonb
  )
on conflict (slug) do update
set titulo = excluded.titulo,
    descricao = excluded.descricao,
    estrutura = excluded.estrutura,
    ativo = true;

insert into squad_integracoes (id, nome, status, config)
values
  ('asaas', 'Asaas', 'aguardando_api_key', '{"env":"ASAAS_API_KEY","sandbox_env":"ASAAS_SANDBOX"}'::jsonb),
  ('videos', 'Biblioteca de videos', 'aguardando_planilha', '{"formato":"nome do exercicio; link YouTube"}'::jsonb),
  ('templates', 'Templates historicos', 'aguardando_material', '{"formato":"planilha ou CSV"}'::jsonb),
  ('logo', 'Logo clara/laranja', 'aguardando_arquivo', '{}'::jsonb),
  ('dieta', 'Metodo de dieta', 'pre_configurado', '{"proteina_g_por_kg":2.2,"gordura_g_por_kg":0.5}'::jsonb)
on conflict (id) do update
set status = excluded.status,
    config = excluded.config,
    updated_at = now();
