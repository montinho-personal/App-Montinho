-- 0154 — Treinos do Montinho (pedido do Montinho, 11/11/2026: “os treinos que eu criei,
-- como o Gomos & Gêmeos, ficam salvos e aparecem para os alunos como treinos que o
-- Montinho já fez, com uma explicação do foco e uma narrativa”).
-- Só o personal grava; todo mundo com login lê os publicados. Nada é apagado: arquivar = removido_em.
create table if not exists public.treinos_montinho (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 120),
  foco text check (foco is null or char_length(foco) <= 200),
  narrativa text check (narrativa is null or char_length(narrativa) <= 1500),
  -- [{biblioteca_id, nome, grupo, series, reps, tecnica, tecnica_config, bloco}]
  itens jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array'),
  sessao_id uuid references public.training_sessions(id) on delete set null,
  feito_em timestamptz,
  publicado boolean not null default true,
  removido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists treinos_montinho_sessao_uk on public.treinos_montinho (sessao_id) where sessao_id is not null and removido_em is null;
alter table public.treinos_montinho enable row level security;
drop policy if exists treinos_montinho_le on public.treinos_montinho;
create policy treinos_montinho_le on public.treinos_montinho for select using ((select public.is_treinador()) or (publicado and removido_em is null and auth.uid() is not null));
drop policy if exists treinos_montinho_cria on public.treinos_montinho;
create policy treinos_montinho_cria on public.treinos_montinho for insert with check ((select public.is_treinador()));
drop policy if exists treinos_montinho_altera on public.treinos_montinho;
create policy treinos_montinho_altera on public.treinos_montinho for update using ((select public.is_treinador())) with check ((select public.is_treinador()));
grant select, insert, update on public.treinos_montinho to authenticated;
