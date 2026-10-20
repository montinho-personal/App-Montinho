-- ============================================================================
-- 0025 — Resumo do histórico de outro app (transcrito de prints pelo personal).
-- Quando o app anterior só mostra o resumo do dia (séries, carga máxima,
-- volume), guardamos exatamente isso — sem inventar carga/reps por série.
-- Usado em: gráfico de evolução por exercício e base de carga para recordes.
-- NÃO entra em aderência, sequência, calendário nem conquistas.
-- RLS: treinador lê e escreve; aluno só lê os próprios registros.
-- ============================================================================

create table if not exists historico_resumo (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  data date not null,
  exercicio_nome text not null check (length(exercicio_nome) between 1 and 160),
  nome_normalizado text not null,
  nome_original text check (nome_original is null or length(nome_original) <= 160),
  biblioteca_id uuid references exercicios_biblioteca(id) on delete set null,
  letra text check (letra is null or letra in ('A','B','C','D','E','F')),
  series integer not null check (series between 0 and 30),
  carga_max_kg numeric(6,2) check (carga_max_kg is null or carga_max_kg >= 0),
  volume_kg numeric(10,2) check (volume_kg is null or volume_kg >= 0),
  reps_total integer check (reps_total is null or reps_total >= 0),
  fonte text not null default 'app_anterior' check (length(fonte) <= 60),
  importacao text check (importacao is null or length(importacao) <= 80),
  observacao text check (observacao is null or length(observacao) <= 300),
  criado_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (aluno_id, data, nome_normalizado, fonte)
);
create index if not exists idx_historico_resumo_aluno on historico_resumo(aluno_id, data);

alter table historico_resumo enable row level security;

drop policy if exists historico_resumo_treinador on historico_resumo;
create policy historico_resumo_treinador on historico_resumo for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists historico_resumo_aluno_le on historico_resumo;
create policy historico_resumo_aluno_le on historico_resumo for select using (aluno_id = (select public.aluno_id_atual()));
