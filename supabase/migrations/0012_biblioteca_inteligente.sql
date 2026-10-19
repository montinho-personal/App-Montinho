-- ============================================================================
-- Montinho — Biblioteca Inteligente de Exercícios (Migration 0012)
-- ============================================================================
-- 1. Metadados biomecânicos em exercicios_biblioteca (padrão de movimento,
--    articulações, tipo, erros comuns, campos de registro, pesos para volume
--    ponderado, estresse articular, nível, origem).
-- 2. Equivalências entre exercícios, revisáveis pelo treinador
--    (sugerida → aprovada/rejeitada). Nada é equivalente "automaticamente".
-- 3. Favoritos do treinador.
-- Tudo aditivo. Nenhuma prescrição (tabela exercicios) é alterada.
-- ============================================================================

-- 1) Metadados ---------------------------------------------------------------
alter table exercicios_biblioteca add column if not exists padrao_movimento text;
alter table exercicios_biblioteca add column if not exists articulacoes text[] not null default '{}';
alter table exercicios_biblioteca add column if not exists tipo_movimento text
  check (tipo_movimento in ('multiarticular', 'monoarticular'));
alter table exercicios_biblioteca add column if not exists erros_comuns text[] not null default '{}';
alter table exercicios_biblioteca add column if not exists campos_registro text[] not null default '{carga,repeticoes}';
alter table exercicios_biblioteca add column if not exists pesos_secundarios jsonb not null default '{}'::jsonb;
alter table exercicios_biblioteca add column if not exists estresse_articular text[] not null default '{}';
alter table exercicios_biblioteca add column if not exists nivel_minimo text
  check (nivel_minimo in ('iniciante', 'intermediario', 'avancado'));
alter table exercicios_biblioteca add column if not exists conta_volume boolean not null default true;
alter table exercicios_biblioteca add column if not exists origem text not null default 'treinador'
  check (origem in ('catalogo', 'treinador'));
alter table exercicios_biblioteca add column if not exists catalogo_versao integer;

create index if not exists idx_biblioteca_padrao on exercicios_biblioteca(padrao_movimento);
create index if not exists idx_biblioteca_sinonimos on exercicios_biblioteca using gin(sinonimos);

-- 2) Equivalências -----------------------------------------------------------
create table if not exists exercicio_equivalencias (
  id uuid primary key default gen_random_uuid(),
  exercicio_id uuid not null references exercicios_biblioteca(id) on delete cascade,
  alternativa_id uuid not null references exercicios_biblioteca(id) on delete cascade,
  origem text not null default 'treinador' check (origem in ('catalogo', 'treinador')),
  status text not null default 'sugerida' check (status in ('sugerida', 'aprovada', 'rejeitada')),
  nota text,
  autor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercicio_id, alternativa_id),
  check (exercicio_id <> alternativa_id)
);
create index if not exists idx_equivalencias_exercicio on exercicio_equivalencias(exercicio_id);
do $$ begin
  create trigger trg_equivalencias_updated before update on exercicio_equivalencias
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- 3) Favoritos do treinador ----------------------------------------------------
create table if not exists exercicio_favoritos (
  treinador_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  exercicio_id uuid not null references exercicios_biblioteca(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (treinador_id, exercicio_id)
);

-- 4) RLS ----------------------------------------------------------------------
alter table exercicio_equivalencias enable row level security;
alter table exercicio_favoritos enable row level security;

drop policy if exists "Treinador gerencia equivalências" on exercicio_equivalencias;
create policy "Treinador gerencia equivalências"
  on exercicio_equivalencias for all using (is_treinador()) with check (is_treinador());

drop policy if exists "Treinador gerencia os próprios favoritos" on exercicio_favoritos;
create policy "Treinador gerencia os próprios favoritos"
  on exercicio_favoritos for all
  using (is_treinador() and treinador_id = auth.uid())
  with check (is_treinador() and treinador_id = auth.uid());
