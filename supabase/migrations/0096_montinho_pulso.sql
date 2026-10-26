-- ============================================================================
-- 0096 — Montinho Pulso (check-in de bem-estar unificado) — ADITIVA
-- * check_ins (0003, 1 linha por aluno por dia) passa a guardar também as
--   respostas do Pulso: energia, corpo (recuperação), vontade de treinar, sono,
--   o que está dificultando, se pulou e a sessão de treino ligada. As réguas
--   antigas 1–10 continuam como estão (histórico preservado).
-- * pulso_preferencias: consentimento específico para dado de saúde (corpo e
--   sono — LGPD art. 11) e se o aluno compartilha as tendências com o personal.
-- * acompanhamento_alertas: o que o personal fez com cada alerta (acompanhado,
--   dispensado, adiado) para não repetir o mesmo alerta (cooldown).
-- * dados_saude_acessos: registro de quem abriu o histórico de bem-estar.
-- * intervencoes.tipo aceita 'contato' (contato registrado pelo personal).
-- RLS: o aluno lê/grava só o próprio; o personal lê; alertas e registro de
-- acesso só o personal. Nada vai para analytics, CRM ou leads.
-- ============================================================================

alter table check_ins add column if not exists origem text not null default 'diario';
alter table check_ins drop constraint if exists check_ins_origem_check;
alter table check_ins add constraint check_ins_origem_check check (origem in ('diario', 'pulso'));
alter table check_ins add column if not exists pulso_energia text
  check (pulso_energia is null or pulso_energia in ('muito_baixa','baixa','normal','alta','muito_alta'));
alter table check_ins add column if not exists pulso_recuperacao text
  check (pulso_recuperacao is null or pulso_recuperacao in ('bem','um_pouco_cansado','muito_cansado','desconforto'));
alter table check_ins add column if not exists pulso_motivacao text
  check (pulso_motivacao is null or pulso_motivacao in ('nenhuma','pouca','normal','muita'));
alter table check_ins add column if not exists pulso_sono text
  check (pulso_sono is null or pulso_sono in ('muito_mal','mal','razoavel','bem','muito_bem'));
alter table check_ins add column if not exists pulso_dificuldades text[]
  check (pulso_dificuldades is null or pulso_dificuldades <@ array['falta_tempo','cansaco','desmotivacao','exercicios','rotina_corrida','nada']::text[]);
alter table check_ins add column if not exists pulso_pulou boolean not null default false;
alter table check_ins add column if not exists sessao_id uuid references training_sessions(id) on delete set null;
alter table check_ins add column if not exists respondido_em timestamptz;
alter table check_ins drop constraint if exists check_ins_notas_tamanho;
alter table check_ins add constraint check_ins_notas_tamanho check (notas is null or length(notas) <= 300) not valid;

-- ---------------------------------------------------------------------------
create table if not exists pulso_preferencias (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  consentimento_saude_em timestamptz,
  consentimento_revogado_em timestamptz,
  compartilhar_tendencias boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table pulso_preferencias enable row level security;
drop policy if exists pulso_pref_aluno on pulso_preferencias;
create policy pulso_pref_aluno on pulso_preferencias for all
  using (aluno_id = public.aluno_id_atual()) with check (aluno_id = public.aluno_id_atual());
drop policy if exists pulso_pref_treinador_le on pulso_preferencias;
create policy pulso_pref_treinador_le on pulso_preferencias for select using (public.is_treinador());

-- ---------------------------------------------------------------------------
create table if not exists acompanhamento_alertas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  origem text not null check (origem in ('pulso', 'aderencia')),
  -- Identifica o alerta (ex.: 'pulso:desconforto:2026-10-25'), sem dado de saúde em texto livre.
  chave text not null check (length(chave) between 3 and 120),
  estado text not null check (estado in ('acompanhado', 'dispensado', 'adiado')),
  adiado_ate date,
  nota text check (nota is null or length(nota) <= 500),
  autor_id uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (aluno_id, chave),
  check (estado <> 'adiado' or adiado_ate is not null)
);
create index if not exists idx_acomp_alertas_aluno on acompanhamento_alertas(aluno_id, updated_at desc);
alter table acompanhamento_alertas enable row level security;
drop policy if exists acomp_alertas_treinador on acompanhamento_alertas;
create policy acomp_alertas_treinador on acompanhamento_alertas for all using (public.is_treinador()) with check (public.is_treinador());

-- ---------------------------------------------------------------------------
create table if not exists dados_saude_acessos (
  id bigint generated always as identity primary key,
  leitor_id uuid not null references profiles(id) on delete cascade default auth.uid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  recurso text not null check (recurso in ('pulso_historico', 'pulso_painel')),
  created_at timestamptz not null default now()
);
create index if not exists idx_saude_acessos_aluno on dados_saude_acessos(aluno_id, created_at desc);
alter table dados_saude_acessos enable row level security;
drop policy if exists saude_acessos_treinador_le on dados_saude_acessos;
create policy saude_acessos_treinador_le on dados_saude_acessos for select using (public.is_treinador());
drop policy if exists saude_acessos_treinador_grava on dados_saude_acessos;
create policy saude_acessos_treinador_grava on dados_saude_acessos for insert with check (public.is_treinador() and leitor_id = auth.uid());

-- ---------------------------------------------------------------------------
alter table intervencoes drop constraint if exists intervencoes_tipo_check;
alter table intervencoes add constraint intervencoes_tipo_check
  check (tipo in ('nota','revisao_treino','ajuste_programa','mensagem','decisao','resposta_adaptacao','contato'));

-- ---------------------------------------------------------------------------
-- Guarda: a observação escrita do check-in some depois de 12 meses (as
-- escolhas ficam). Chamada pelo cron do app com a mesma chave dos lembretes.
create or replace function public.pulso_limpar_notas_antigas(p_chave text)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare n integer;
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  update check_ins set notas = null where notas is not null and data < (current_date - interval '12 months');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.pulso_limpar_notas_antigas(text) from public;
grant execute on function public.pulso_limpar_notas_antigas(text) to anon;
