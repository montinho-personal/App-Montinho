-- ============================================================================
-- 0029 — Montinho Evolução Inteligente: configuração do personal por aluno.
-- As descobertas NÃO são gravadas: são recalculadas dos registros reais (se a
-- série é editada ou excluída, a descoberta muda junto). Aqui fica só o que o
-- personal decide: avisos ligados, limites e métricas permitidas.
-- RLS: personal lê e escreve; aluno só lê a própria configuração.
-- ============================================================================

create table if not exists evolucao_config (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  avisos_ativos boolean not null default true,
  max_por_exercicio smallint not null default 1 check (max_por_exercicio between 0 and 5),
  max_por_sessao smallint not null default 3 check (max_por_sessao between 0 and 10),
  metricas text[] not null default array['recorde','mais_carga','mais_reps','acima_media']::text[]
    check (metricas <@ array['recorde','mais_carga','mais_reps','acima_media']::text[]),
  atualizado_por uuid references profiles(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table evolucao_config enable row level security;
drop policy if exists evolucao_config_treinador on evolucao_config;
create policy evolucao_config_treinador on evolucao_config for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists evolucao_config_aluno_le on evolucao_config;
create policy evolucao_config_aluno_le on evolucao_config for select using (aluno_id = (select public.aluno_id_atual()));
