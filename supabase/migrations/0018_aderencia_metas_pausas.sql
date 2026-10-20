-- ============================================================================
-- 0018 — Central de aderência: meta semanal versionada e pausas justificadas
-- * metas_semanais: cada alteração cria uma linha (histórico preservado); a
--   meta de uma semana é a vigente na segunda-feira (src/lib/aderencia).
-- * pausas_aluno: férias, lesão, descanso prescrito… semanas cobertas (≥ 4
--   dias) saem do cálculo e não quebram a sequência.
-- RLS: treinador lê e escreve; aluno só lê os próprios registros.
-- ============================================================================

create table if not exists metas_semanais (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  meta integer not null check (meta between 1 and 7),
  vigente_desde date not null,
  observacao text check (observacao is null or length(observacao) <= 300),
  criado_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_metas_semanais_aluno on metas_semanais(aluno_id, vigente_desde);

create table if not exists pausas_aluno (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  inicio date not null,
  fim date,
  tipo text not null default 'outro' check (tipo in ('ferias','lesao','descanso_prescrito','viagem','saude','outro')),
  motivo text check (motivo is null or length(motivo) <= 300),
  criado_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (fim is null or fim >= inicio)
);
create index if not exists idx_pausas_aluno on pausas_aluno(aluno_id, inicio);

alter table metas_semanais enable row level security;
alter table pausas_aluno enable row level security;

drop policy if exists metas_semanais_treinador on metas_semanais;
create policy metas_semanais_treinador on metas_semanais for all using (public.is_treinador()) with check (public.is_treinador());
drop policy if exists metas_semanais_aluno_le on metas_semanais;
create policy metas_semanais_aluno_le on metas_semanais for select using (aluno_id = public.aluno_id_atual());

drop policy if exists pausas_aluno_treinador on pausas_aluno;
create policy pausas_aluno_treinador on pausas_aluno for all using (public.is_treinador()) with check (public.is_treinador());
drop policy if exists pausas_aluno_le on pausas_aluno;
create policy pausas_aluno_le on pausas_aluno for select using (aluno_id = public.aluno_id_atual());
