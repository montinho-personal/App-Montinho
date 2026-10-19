-- ============================================================================
-- Squad App — Base de Conhecimento + Storage (Migration 0004)
-- ============================================================================
-- Adiciona tabela `conhecimento` para armazenar livros, cursos, papers, vídeos
-- e transcrições que servem de fonte para o sistema. Cada item pode ser citado
-- por exercícios e templates.
-- ============================================================================

create type conhecimento_tipo as enum (
  'livro', 'curso', 'paper', 'video', 'transcricao', 'aula', 'apostila', 'outro'
);

create table conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  autores text[] default '{}',
  tipo conhecimento_tipo not null,
  ano integer,
  descricao text,
  -- Conteúdo
  arquivo_url text,        -- PDF/MP4 no storage
  link_externo text,       -- URL pública (YouTube, paper, etc)
  transcricao text,        -- texto completo para busca
  tags text[] default '{}',
  -- Citação acadêmica formatada (opcional)
  citacao_apa text,
  -- Metadados
  paginas integer,
  duracao_seg integer,
  -- Soft delete + ordenação
  arquivado boolean not null default false,
  destaque boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conhecimento_tipo on conhecimento(tipo);
create index idx_conhecimento_destaque on conhecimento(destaque) where destaque = true;
create index idx_conhecimento_tags on conhecimento using gin(tags);
create index idx_conhecimento_fulltext on conhecimento
  using gin(to_tsvector('portuguese',
    coalesce(titulo, '') || ' ' ||
    coalesce(descricao, '') || ' ' ||
    coalesce(transcricao, '')
  ));

create trigger trg_conhecimento_updated before update on conhecimento
  for each row execute function set_updated_at();

-- =============================================================================
-- Relação muitos-para-muitos: exercicios_biblioteca ↔ conhecimento
-- =============================================================================
create table exercicio_conhecimento (
  exercicio_id uuid not null references exercicios_biblioteca(id) on delete cascade,
  conhecimento_id uuid not null references conhecimento(id) on delete cascade,
  pagina text,
  observacao text,
  primary key (exercicio_id, conhecimento_id)
);

-- =============================================================================
-- Relação muitos-para-muitos: templates_treino ↔ conhecimento
-- =============================================================================
create table template_conhecimento (
  template_id uuid not null references templates_treino(id) on delete cascade,
  conhecimento_id uuid not null references conhecimento(id) on delete cascade,
  observacao text,
  primary key (template_id, conhecimento_id)
);

-- =============================================================================
-- Storage bucket
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('conhecimento', 'conhecimento', false)
on conflict (id) do nothing;

-- =============================================================================
-- RLS
-- =============================================================================
alter table conhecimento enable row level security;
alter table exercicio_conhecimento enable row level security;
alter table template_conhecimento enable row level security;

create policy "Treinador gerencia conhecimento"
  on conhecimento for all using (is_treinador()) with check (is_treinador());

create policy "Aluno lê conhecimento"
  on conhecimento for select using (auth.uid() is not null and not arquivado);

create policy "Treinador gerencia exercicio_conhecimento"
  on exercicio_conhecimento for all using (is_treinador()) with check (is_treinador());

create policy "Aluno lê exercicio_conhecimento"
  on exercicio_conhecimento for select using (auth.uid() is not null);

create policy "Treinador gerencia template_conhecimento"
  on template_conhecimento for all using (is_treinador()) with check (is_treinador());

create policy "Aluno lê template_conhecimento"
  on template_conhecimento for select using (auth.uid() is not null);

-- Storage policies
create policy "Treinador upload conhecimento"
  on storage.objects for insert
  with check (bucket_id = 'conhecimento' and is_treinador());

create policy "Treinador gerencia conhecimento storage"
  on storage.objects for update
  using (bucket_id = 'conhecimento' and is_treinador());

create policy "Autenticado lê conhecimento"
  on storage.objects for select
  using (bucket_id = 'conhecimento' and auth.uid() is not null);
