-- ============================================================================
-- 0052 — Modo Visitante, base (Fase 2 do plano aprovado em 22/10/2026).
--
-- O visitante é um ALUNO com modalidade 'visitante': reaproveita sessões,
-- histórico, evolução, Jornada e medalhas, e a conversão em aluno da
-- consultoria é só trocar a modalidade (nada se perde).
--
--  • alunos.modalidade        'consultoria' (padrão) | 'visitante'
--  • treinos.autoria          'personal' (padrão) | 'proprio' (montado pelo visitante)
--  • campanhas                desafios/campanhas de captação
--  • convites                 códigos de entrada (com limite de usos e validade)
--  • acessos_visitante        prazo e recursos de cada visitante (acesso vencido = só leitura)
--  • perfil_visitante         respostas do onboarding (sem dados de saúde)
--  • pode_registrar()         visitante com acesso vencido não inicia treino novo
--                             (política RESTRITIVA: não muda nada para alunos e treinador)
--
-- Tudo aditivo. Campanhas e convites só o treinador lê/escreve; o cadastro
-- por código é feito pelo servidor (rota com validação), nunca pelo navegador.
-- ============================================================================

alter table alunos add column if not exists modalidade text not null default 'consultoria';
do $$ begin
  alter table alunos add constraint alunos_modalidade_check check (modalidade in ('consultoria', 'visitante'));
exception when duplicate_object then null; end $$;
create index if not exists idx_alunos_modalidade on alunos(modalidade);

alter table treinos add column if not exists autoria text not null default 'personal';
do $$ begin
  alter table treinos add constraint treinos_autoria_check check (autoria in ('personal', 'proprio'));
exception when duplicate_object then null; end $$;

create table if not exists campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  descricao text check (char_length(descricao) <= 2000),
  regras text check (char_length(regras) <= 4000),
  inicio date,
  fim date,
  max_participantes int check (max_participantes is null or max_participantes > 0),
  origem text check (char_length(origem) <= 60),
  ativa boolean not null default true,
  criado_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (fim is null or inicio is null or fim >= inicio)
);

create table if not exists convites (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9-]{4,32}$'),
  campanha_id uuid references campanhas(id) on delete set null,
  -- permanente | dias (7, 14, 21, 30 ou outro) | ate_data (data fixa)
  tipo_acesso text not null default 'dias' check (tipo_acesso in ('permanente', 'dias', 'ate_data')),
  dias int check (dias is null or dias between 1 and 365),
  acesso_ate date,
  max_usos int check (max_usos is null or max_usos > 0),
  usos int not null default 0 check (usos >= 0),
  valido_ate timestamptz,
  renovavel boolean not null default true,
  permite_conversao boolean not null default true,
  origem text check (char_length(origem) <= 60),
  ativo boolean not null default true,
  criado_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (tipo_acesso <> 'dias' or dias is not null),
  check (tipo_acesso <> 'ate_data' or acesso_ate is not null),
  check (max_usos is null or usos <= max_usos)
);
create index if not exists idx_convites_campanha on convites(campanha_id);

create table if not exists acessos_visitante (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  convite_id uuid references convites(id) on delete set null,
  campanha_id uuid references campanhas(id) on delete set null,
  tipo text not null check (tipo in ('permanente', 'dias', 'ate_data')),
  inicio timestamptz not null default now(),
  -- null = sem prazo (permanente)
  fim timestamptz,
  recursos jsonb not null default '{}'::jsonb,
  renovavel boolean not null default true,
  origem text check (char_length(origem) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_acessos_visitante_campanha on acessos_visitante(campanha_id);

create table if not exists perfil_visitante (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  objetivo text check (objetivo in ('hipertrofia', 'emagrecimento', 'condicionamento', 'saude', 'forca', 'outro')),
  experiencia text check (experiencia in ('iniciante', 'intermediario', 'avancado')),
  frequencia_semanal int check (frequencia_semanal between 1 and 7),
  local_treino text check (local_treino in ('academia', 'casa', 'condominio', 'outro')),
  minutos_por_treino int check (minutos_por_treino between 10 and 240),
  dificuldades text[] not null default '{}',
  interesse_desafios boolean,
  onboarding_concluido_em timestamptz,
  aceite_privacidade_em timestamptz,
  updated_at timestamptz not null default now()
);

-- Quem pode registrar treino novo: treinador, aluno da consultoria e visitante
-- com acesso em dia. Visitante vencido continua vendo tudo (só leitura).
create or replace function public.pode_registrar()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_treinador()
    or exists (
      select 1 from public.alunos a
      left join public.acessos_visitante v on v.aluno_id = a.id
      where a.profile_id = auth.uid()
        and (a.modalidade = 'consultoria' or v.fim is null or v.fim > now())
    );
$$;
revoke execute on function public.pode_registrar() from anon;

-- RLS
alter table campanhas enable row level security;
alter table convites enable row level security;
alter table acessos_visitante enable row level security;
alter table perfil_visitante enable row level security;

create policy campanhas_treinador on campanhas for all using (public.is_treinador()) with check (public.is_treinador());
create policy convites_treinador on convites for all using (public.is_treinador()) with check (public.is_treinador());
create policy acessos_visitante_treinador on acessos_visitante for all using (public.is_treinador()) with check (public.is_treinador());
create policy acessos_visitante_le on acessos_visitante for select using (aluno_id = public.aluno_id_atual());
create policy perfil_visitante_treinador on perfil_visitante for all using (public.is_treinador()) with check (public.is_treinador());
create policy perfil_visitante_proprio on perfil_visitante for all using (aluno_id = public.aluno_id_atual()) with check (aluno_id = public.aluno_id_atual());

-- Restritiva (soma-se com E às políticas atuais): acesso vencido não inicia treino.
create policy sessoes_pode_registrar on training_sessions as restrictive for insert with check (public.pode_registrar());
