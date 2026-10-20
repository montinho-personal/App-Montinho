-- ============================================================================
-- 0027 — Estratégia do aluno importada do Montinho Strategy (relatório PDF).
-- Guarda o que foi lido do relatório (objetivo, divisão, volume por músculo,
-- fases, progressão, acompanhamento semanal…) como JSON versionado: cada
-- importação é uma linha nova; a mais recente é a vigente. Nada é apagado.
-- RLS: treinador lê e escreve; aluno só lê a própria (para ver “Sua estratégia”).
-- ============================================================================

create table if not exists estrategias_aluno (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  titulo text check (titulo is null or length(titulo) <= 160),
  data_relatorio date,
  dados jsonb not null,
  arquivo_nome text check (arquivo_nome is null or length(arquivo_nome) <= 200),
  plano_criado boolean not null default false,
  criado_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_estrategias_aluno on estrategias_aluno(aluno_id, created_at desc);

alter table estrategias_aluno enable row level security;

drop policy if exists estrategias_treinador on estrategias_aluno;
create policy estrategias_treinador on estrategias_aluno for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists estrategias_aluno_le on estrategias_aluno;
create policy estrategias_aluno_le on estrategias_aluno for select using (aluno_id = (select public.aluno_id_atual()));
