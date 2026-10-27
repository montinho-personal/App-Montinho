-- ============================================================================
-- 0098 — Montinho Cardio (aprovado pelo Montinho em 27/10/2026).
-- * cardio_prescricoes: o cardio que o PERSONAL prescreve para cada aluno
--   (modalidade, duração, intensidade, vezes por semana, dias, FC-alvo,
--   contínuo/intervalado, depois de um treino ou sessão independente).
--   Mudar a prescrição = desativar a antiga (desativado_em) e criar outra:
--   as semanas passadas continuam com a meta que valia na época. Nunca apaga.
-- * cardio_registros: o que o aluno (ou o personal) registrou. Guarda o
--   planejado do dia (cópia) ao lado do realizado. Correção = update;
--   exclusão = removido_em (nunca some do banco). client_key evita duplicar.
--   Extras de cardio e cardios do Strava NÃO são copiados para cá: o app os
--   lê de onde já estão (sem minuto contado duas vezes).
-- * Troféus de cardio aceitos em conquistas_aluno (regras no app:
--   src/lib/cardio/trofeus.ts). 500/1.000 já aceitos, ainda desligados.
-- * Ranking conta os troféus de cardio da sala de troféus; fica fora o “Voltei
--   a Respirar” (repete, como o “Eu voltei”) e 500/1.000 (ainda desligados).
--   “Uma Hora de Chalalá” conta: só sai cumprindo a prescrição, sem passar dela.
-- * acompanhamento_alertas aceita origem 'cardio'.
-- RLS: aluno lê/grava só o próprio; o personal lê e grava de todos.
-- FC é dado de saúde: nunca vai para analytics, CRM ou leads.
-- ============================================================================

create table if not exists cardio_prescricoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  modalidade text not null check (modalidade in ('caminhada','corrida','esteira','bike_ergometrica','bike','eliptico','escada','remo','natacao','corda','hiit','outro')),
  nome text check (nome is null or length(nome) between 1 and 60),
  tipo text not null default 'continuo' check (tipo in ('continuo','intervalado')),
  duracao_min smallint not null check (duracao_min between 5 and 240),
  intensidade text not null default 'moderada' check (intensidade in ('leve','moderada','forte')),
  frequencia_semanal smallint not null check (frequencia_semanal between 1 and 7),
  dias smallint[] not null default '{}' check (dias <@ array[0,1,2,3,4,5,6]::smallint[]),
  vinculo text not null default 'independente' check (vinculo in ('independente','apos_treino','antes_treino')),
  treino_id uuid references treinos(id) on delete set null,
  fc_alvo_min smallint check (fc_alvo_min is null or fc_alvo_min between 60 and 220),
  fc_alvo_max smallint check (fc_alvo_max is null or fc_alvo_max between 60 and 220),
  intervalos text check (intervalos is null or length(intervalos) <= 200),
  observacoes text check (observacoes is null or length(observacoes) <= 500),
  ativo boolean not null default true,
  desativado_em timestamptz,
  autor_id uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fc_alvo_min is null or fc_alvo_max is null or fc_alvo_min <= fc_alvo_max),
  check (ativo or desativado_em is not null)
);
create index if not exists idx_cardio_prescricoes_aluno on cardio_prescricoes(aluno_id, created_at desc);

create table if not exists cardio_registros (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  prescricao_id uuid references cardio_prescricoes(id) on delete set null,
  modalidade text not null check (modalidade in ('caminhada','corrida','esteira','bike_ergometrica','bike','eliptico','escada','remo','natacao','corda','hiit','outro')),
  status text not null check (status in ('concluido','parcial','nao_realizado')),
  duracao_min smallint not null default 0 check (duracao_min between 0 and 600),
  planejado_min smallint check (planejado_min is null or planejado_min between 5 and 240),
  intensidade_planejada text check (intensidade_planejada is null or intensidade_planejada in ('leve','moderada','forte')),
  intensidade text check (intensidade is null or intensidade in ('leve','moderada','forte')),
  esforco smallint check (esforco is null or esforco between 0 and 10),
  distancia_km numeric(6,2) check (distancia_km is null or distancia_km between 0 and 500),
  velocidade_kmh numeric(5,1) check (velocidade_kmh is null or velocidade_kmh between 0 and 80),
  inclinacao_pct numeric(4,1) check (inclinacao_pct is null or inclinacao_pct between -10 and 40),
  fc_media smallint check (fc_media is null or fc_media between 30 and 240),
  fc_max smallint check (fc_max is null or fc_max between 30 and 240),
  observacoes text check (observacoes is null or length(observacoes) <= 300),
  session_id uuid references training_sessions(id) on delete set null,
  origem text not null default 'app' check (origem in ('app','personal')),
  client_key text not null check (length(client_key) between 8 and 80),
  data date not null,
  realizado_em timestamptz not null default now(),
  removido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (aluno_id, client_key),
  check (status <> 'nao_realizado' or duracao_min = 0)
);
create index if not exists idx_cardio_registros_aluno on cardio_registros(aluno_id, data desc) where removido_em is null;
-- O mesmo cardio prescrito não é registrado duas vezes para o mesmo treino de musculação.
create unique index if not exists uq_cardio_registro_sessao on cardio_registros(session_id, prescricao_id) where session_id is not null and prescricao_id is not null and removido_em is null;

do $$ begin
  create trigger trg_cardio_prescricoes_updated before update on cardio_prescricoes for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger trg_cardio_registros_updated before update on cardio_registros for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

alter table cardio_prescricoes enable row level security;
alter table cardio_registros enable row level security;

drop policy if exists cardio_presc_treinador on cardio_prescricoes;
create policy cardio_presc_treinador on cardio_prescricoes for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists cardio_presc_aluno_le on cardio_prescricoes;
create policy cardio_presc_aluno_le on cardio_prescricoes for select using (aluno_id = (select public.aluno_id_atual()));

drop policy if exists cardio_reg_treinador on cardio_registros;
create policy cardio_reg_treinador on cardio_registros for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists cardio_reg_aluno_le on cardio_registros;
create policy cardio_reg_aluno_le on cardio_registros for select using (aluno_id = (select public.aluno_id_atual()));
drop policy if exists cardio_reg_aluno_grava on cardio_registros;
create policy cardio_reg_aluno_grava on cardio_registros for insert
  with check (aluno_id = (select public.aluno_id_atual()) and origem = 'app');
drop policy if exists cardio_reg_aluno_corrige on cardio_registros;
create policy cardio_reg_aluno_corrige on cardio_registros for update
  using (aluno_id = (select public.aluno_id_atual()) and origem = 'app')
  with check (aluno_id = (select public.aluno_id_atual()) and origem = 'app');
-- Sem política de DELETE para o aluno: excluir = removido_em.

-- Troféus de cardio --------------------------------------------------------
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo','criador_desafios','campeao_desafio','palavra_cumprida','desafiante_nato',
  'cardio_1','cardio_2','cardio_3','cardio_10','cardio_25','cardio_50','cardio_100','cardio_250','cardio_500','cardio_1000','cardio_uma_hora','cardio_semana_ritmo','cardio_meta_semana','cardio_4_semanas','cardio_voltei'));

-- Alertas da Central também para o cardio ----------------------------------
alter table acompanhamento_alertas drop constraint if exists acompanhamento_alertas_origem_check;
alter table acompanhamento_alertas add constraint acompanhamento_alertas_origem_check check (origem in ('pulso', 'aderencia', 'cardio'));

-- Ranking: mesmos troféus da sala, sem os que se repetem ou premiam “mais” ----
create or replace function public.ranking_trofeus_v2()
returns table (posicao int, nome text, trofeus int, eu boolean, visitante boolean, aderencia_semana int, mesmo_total_acima boolean)
language sql
stable
security definer
set search_path = public
as $$
  with quem as (
    select public.is_treinador() as treinador, (select id from alunos where profile_id = auth.uid()) as meu
  ),
  contagem as (
    select k.aluno_id, count(*)::int as n, max(k.primeira) as chegou_em
    from (
      select c.aluno_id, c.codigo, min(c.conquistado_em) as primeira
      from conquistas_aluno c
      where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000')
      group by c.aluno_id, c.codigo
    ) k
    group by k.aluno_id
  ),
  base as (
    select a.id, a.modalidade, coalesce(nullif(btrim(p.nome), ''), 'Aluno') as nome_completo, k.n, k.chegou_em,
           d.pct_semana, coalesce(d.semanas_seguidas, 0) as seguidas, d.pct_4sem
    from alunos a
    join contagem k on k.aluno_id = a.id
    left join profiles p on p.id = a.profile_id
    left join ranking_desempate d on d.aluno_id = a.id
    cross join quem
    where auth.uid() is not null
      and (quem.treinador or quem.meu is not null)
      and a.status = 'ativo'
      and k.n > 0
      and (a.ranking_visivel or a.id = quem.meu or quem.treinador)
  ),
  ordenado as (
    select b.*,
           rank() over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as pos,
           lag(b.n) over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as n_acima
    from base b
  )
  select o.pos::int,
         case when (select treinador from quem) then o.nome_completo
              else split_part(o.nome_completo, ' ', 1)
                   || coalesce(' ' || nullif(left(regexp_replace(o.nome_completo, '^.*\s', ''), 1), left(split_part(o.nome_completo, ' ', 1), 1)) || '.', '')
         end,
         o.n,
         o.id = (select meu from quem),
         o.modalidade = 'visitante',
         case when (select treinador from quem) or o.id = (select meu from quem) then o.pct_semana::int end,
         coalesce(o.n_acima = o.n, false)
  from ordenado o
  order by 1, 2;
$$;
revoke all on function public.ranking_trofeus_v2() from public, anon;
grant execute on function public.ranking_trofeus_v2() to authenticated;
