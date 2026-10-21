-- ============================================================================
-- 0034 — Alternativas ocultas por aluno: o personal tira uma alternativa da
-- lista de trocas de um exercício só para aquele aluno (montador e "Trocar"
-- no treino). É preferência, não histórico: pode voltar a mostrar (delete).
-- ============================================================================
create table if not exists alternativas_ocultas (
  aluno_id uuid not null references alunos(id) on delete cascade,
  exercicio_id uuid not null references exercicios_biblioteca(id) on delete cascade,
  alternativa_id uuid not null references exercicios_biblioteca(id) on delete cascade,
  criado_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (aluno_id, exercicio_id, alternativa_id),
  check (exercicio_id <> alternativa_id)
);

alter table alternativas_ocultas enable row level security;
drop policy if exists alternativas_ocultas_treinador on alternativas_ocultas;
create policy alternativas_ocultas_treinador on alternativas_ocultas for all using (public.is_treinador()) with check (public.is_treinador());
drop policy if exists alternativas_ocultas_aluno_le on alternativas_ocultas;
create policy alternativas_ocultas_aluno_le on alternativas_ocultas for select using (aluno_id = public.aluno_id_atual());
