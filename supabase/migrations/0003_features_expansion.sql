-- ============================================================================
-- Squad App — Expansão de features (Migration 0003)
-- ============================================================================
-- Adiciona 6 tabelas críticas:
--   - exercicios_biblioteca  → catálogo do Pedro, com vídeo, reutilizável
--   - templates_treino       → modelos pra clonar entre alunos
--   - anamnese               → formulário inicial do aluno
--   - check_ins              → check-in diário 1-10 (energia, sono, dor)
--   - mensagens              → chat treinador ↔ aluno
--   - avaliacoes_fisicas     → agendamento de avaliações
-- Refatora `exercicios` pra apontar pra biblioteca (FK opcional).
-- ============================================================================

-- Enums ----------------------------------------------------------------------
create type grupo_muscular as enum (
  'peito', 'costas', 'pernas', 'gluteo', 'ombros', 'biceps',
  'triceps', 'antebraco', 'abdomen', 'core', 'panturrilha',
  'cardio', 'full_body', 'outro'
);

create type equipamento as enum (
  'barra', 'halter', 'maquina', 'polia', 'peso_corporal',
  'cabo', 'kettlebell', 'elastico', 'esteira', 'bike',
  'corda', 'banco', 'smith', 'outro'
);

create type video_provider as enum ('cloudflare_stream', 'youtube', 'mux', 'direct_url');

create type mensagem_tipo as enum ('texto', 'imagem', 'audio', 'sistema');

-- =============================================================================
-- exercicios_biblioteca — catálogo do Pedro
-- =============================================================================
create table exercicios_biblioteca (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  grupo_muscular grupo_muscular not null,
  grupos_secundarios grupo_muscular[] default '{}',
  equipamento equipamento[] default '{}',

  -- Vídeo demonstrativo
  video_provider video_provider,
  video_id text,                    -- UID do Cloudflare Stream, ou videoId do YouTube, ou URL direta
  thumbnail_url text,
  duracao_seg integer,

  -- Conteúdo extra
  descricao text,
  instrucoes text[],                -- passo a passo
  observacoes text,
  dificuldade integer check (dificuldade between 1 and 5),

  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_biblioteca_grupo on exercicios_biblioteca(grupo_muscular);
create index idx_biblioteca_arquivado on exercicios_biblioteca(arquivado);

-- Apontar `exercicios` pra biblioteca (FK opcional pra não quebrar treinos avulsos)
alter table exercicios add column biblioteca_id uuid references exercicios_biblioteca(id) on delete set null;
create index idx_exercicios_biblioteca on exercicios(biblioteca_id);

-- =============================================================================
-- templates_treino — modelos pra clonar
-- =============================================================================
create table templates_treino (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  publico_alvo text,                -- "iniciante feminino", "intermediário hipertrofia"
  numero_treinos integer not null default 5,
  -- Estrutura serializada: { "A": { nome, exercicios: [{biblioteca_id, series, reps, ie}] }, ... }
  estrutura jsonb not null,
  uso_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- anamnese — formulário inicial
-- =============================================================================
create table anamnese (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null unique references alunos(id) on delete cascade,

  -- Objetivo
  objetivo_principal text,
  prazo_meses integer,
  meta_peso_kg numeric(5, 2),

  -- Histórico de treino
  ja_treinou boolean,
  tempo_treino_meses integer,
  frequencia_semanal integer,

  -- Saúde
  lesoes text,
  cirurgias text,
  medicamentos text,
  doencas_cronicas text,
  dores_atuais text,

  -- Equipamento disponível
  onde_treina text,                 -- "academia", "casa", "ar livre"
  equipamentos_disponiveis equipamento[] default '{}',

  -- Hábitos
  horas_sono numeric(3, 1),
  consome_alcool text,
  fuma boolean,
  estresse_nivel integer check (estresse_nivel between 1 and 10),

  -- Termos
  aceita_termos boolean not null default false,
  assinado_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- check_ins — check-in diário 1-10
-- =============================================================================
create table check_ins (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  data date not null default current_date,

  energia integer check (energia between 1 and 10),
  sono integer check (sono between 1 and 10),
  dor integer check (dor between 1 and 10),
  motivacao integer check (motivacao between 1 and 10),
  estresse integer check (estresse between 1 and 10),

  notas text,

  created_at timestamptz not null default now(),
  unique(aluno_id, data)
);

create index idx_checkins_aluno_data on check_ins(aluno_id, data desc);

-- =============================================================================
-- mensagens — chat treinador ↔ aluno
-- =============================================================================
create table mensagens (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  remetente_id uuid not null references profiles(id) on delete cascade,
  tipo mensagem_tipo not null default 'texto',
  conteudo text not null,
  anexo_url text,
  lida_em timestamptz,
  created_at timestamptz not null default now()
);

create index idx_mensagens_aluno on mensagens(aluno_id, created_at desc);
create index idx_mensagens_remetente on mensagens(remetente_id);

-- =============================================================================
-- avaliacoes_fisicas — agendamento
-- =============================================================================
create table avaliacoes_fisicas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  agendada_para timestamptz not null,
  realizada boolean not null default false,
  evolucao_id uuid references evolucao(id) on delete set null,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_avaliacoes_aluno on avaliacoes_fisicas(aluno_id, agendada_para desc);

-- Triggers updated_at -------------------------------------------------------
create trigger trg_biblioteca_updated before update on exercicios_biblioteca
  for each row execute function set_updated_at();
create trigger trg_templates_updated before update on templates_treino
  for each row execute function set_updated_at();
create trigger trg_anamnese_updated before update on anamnese
  for each row execute function set_updated_at();
create trigger trg_avaliacoes_updated before update on avaliacoes_fisicas
  for each row execute function set_updated_at();

-- =============================================================================
-- RLS -----------------------------------------------------------------------
-- =============================================================================
alter table exercicios_biblioteca enable row level security;
alter table templates_treino enable row level security;
alter table anamnese enable row level security;
alter table check_ins enable row level security;
alter table mensagens enable row level security;
alter table avaliacoes_fisicas enable row level security;

-- Biblioteca: todos os autenticados leem, só treinador escreve
create policy "Todos leem biblioteca"
  on exercicios_biblioteca for select using (auth.uid() is not null);
create policy "Treinador gerencia biblioteca"
  on exercicios_biblioteca for all using (is_treinador()) with check (is_treinador());

-- Templates: só treinador
create policy "Treinador gerencia templates"
  on templates_treino for all using (is_treinador()) with check (is_treinador());

-- Anamnese: aluno lê/escreve a própria, treinador vê todas
create policy "Aluno lê própria anamnese"
  on anamnese for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Aluno escreve própria anamnese"
  on anamnese for insert with check (aluno_id = aluno_id_atual());
create policy "Aluno atualiza própria anamnese"
  on anamnese for update using (aluno_id = aluno_id_atual());
create policy "Treinador gerencia anamnese"
  on anamnese for all using (is_treinador()) with check (is_treinador());

-- Check-ins: aluno faz os seus, treinador lê
create policy "Aluno lê próprios check-ins"
  on check_ins for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Aluno escreve próprio check-in"
  on check_ins for insert with check (aluno_id = aluno_id_atual());
create policy "Aluno atualiza próprio check-in do dia"
  on check_ins for update using (aluno_id = aluno_id_atual());

-- Mensagens: aluno vê só dele com o treinador
create policy "Aluno lê suas mensagens"
  on mensagens for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Usuário envia mensagem em conversa dele"
  on mensagens for insert with check (
    remetente_id = auth.uid()
    and (aluno_id = aluno_id_atual() or is_treinador())
  );

-- Avaliações: aluno lê as suas, treinador gerencia
create policy "Aluno lê suas avaliações"
  on avaliacoes_fisicas for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Treinador gerencia avaliações"
  on avaliacoes_fisicas for all using (is_treinador()) with check (is_treinador());
