-- ============================================================================
-- 0079 — Desempate do ranking de troféus (aprovado pelo Montinho em 23/10/2026).
-- Ordem: 1) troféus; 2) aderência da última semana fechada (treinos ÷ meta,
-- máx. 100%, semana de pausa não conta); 3) semanas seguidas com a meta;
-- 4) aderência das últimas 4 semanas; 5) quem chegou primeiro ao número de
-- troféus. A aderência é calculada no app (mesma conta da Evolução) e gravada
-- aqui SÓ pelo personal (o aluno não grava: ninguém “inventa” a própria nota).
-- Os outros alunos não veem a aderência de ninguém: só a posição.
-- ============================================================================
create table if not exists ranking_desempate (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  pct_semana smallint check (pct_semana between 0 and 100),
  semana_inicio date,
  semanas_seguidas smallint not null default 0 check (semanas_seguidas >= 0),
  pct_4sem smallint check (pct_4sem between 0 and 100),
  atualizado_em timestamptz not null default now()
);
alter table ranking_desempate enable row level security;
drop policy if exists desempate_treinador on ranking_desempate;
create policy desempate_treinador on ranking_desempate for all using ((select public.is_treinador())) with check ((select public.is_treinador()));

-- Função nova (v2) ao lado da antiga: trocar o tipo de retorno exigiria apagar
-- a antiga, e o app em uso continua chamando-a até publicar o código novo.
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
    -- Data em que chegou ao total atual = a do troféu mais recente (cada código conta 1 vez, pela 1ª data).
    select k.aluno_id, count(*)::int as n, max(k.primeira) as chegou_em
    from (
      select c.aluno_id, c.codigo, min(c.conquistado_em) as primeira
      from conquistas_aluno c
      where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido')
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
