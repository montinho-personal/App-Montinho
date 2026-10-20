-- ============================================================================
-- 0016 — Tempos do treino (estimativa de duração e ritmo)
-- Precedência dos descansos: série (series_config) > exercício > treino >
-- padrão do treinador > padrão do app (src/lib/tempo/estimar.ts).
-- Aditiva: nada existente muda; null = usar o nível de cima.
-- ============================================================================

alter table exercicios add column if not exists descanso_apos_seg integer
  check (descanso_apos_seg is null or descanso_apos_seg between 0 and 900);

-- Parâmetros de tempo do treino (descanso entre séries, após exercício, s/rep,
-- transição, preparação) e tempo-alvo em minutos.
alter table treinos add column if not exists tempos jsonb not null default '{}'::jsonb;
alter table treinos add column if not exists tempo_alvo_min integer
  check (tempo_alvo_min is null or tempo_alvo_min between 5 and 300);

-- Padrões pessoais do treinador (cada um vê e edita só os seus).
create table if not exists preferencias_treinador (
  profile_id uuid primary key references profiles(id) on delete cascade,
  tempos jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table preferencias_treinador enable row level security;
drop policy if exists preferencias_treinador_proprias on preferencias_treinador;
create policy preferencias_treinador_proprias on preferencias_treinador
  for all using (profile_id = auth.uid() and public.is_treinador())
  with check (profile_id = auth.uid() and public.is_treinador());
