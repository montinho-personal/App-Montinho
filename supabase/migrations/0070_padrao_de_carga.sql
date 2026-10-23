-- ============================================================================
-- 0070 — Como o aluno anota o peso de anilhas (barra/Smith) e halteres:
-- 'total' (10 de cada lado = 20) ou 'por_lado' (10 de cada lado = 10).
-- O aluno grava a própria escolha; o personal lê e pode ajustar (aula presencial).
-- ============================================================================
create table if not exists preferencias_carga (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  anilhas text check (anilhas in ('total', 'por_lado')),
  halteres text check (halteres in ('total', 'por_lado')),
  atualizado_em timestamptz not null default now()
);
alter table preferencias_carga enable row level security;
drop policy if exists pref_carga_propria on preferencias_carga;
create policy pref_carga_propria on preferencias_carga for all
  using (aluno_id = (select public.aluno_id_atual())) with check (aluno_id = (select public.aluno_id_atual()));
drop policy if exists pref_carga_treinador on preferencias_carga;
create policy pref_carga_treinador on preferencias_carga for all
  using ((select public.is_treinador())) with check ((select public.is_treinador()));
