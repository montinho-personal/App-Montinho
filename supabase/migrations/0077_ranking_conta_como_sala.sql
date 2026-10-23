-- ============================================================================
-- 0077 — Ranking conta os mesmos troféus da sala de troféus.
-- Recordes, retomadas (“Eu voltei”) e desafios do visitante se repetem e ficam
-- em seções próprias: não entram na contagem do ranking (antes entravam e o
-- número podia ficar 1 acima do que a pessoa via nos troféus dela).
-- ============================================================================
create or replace function public.ranking_trofeus()
returns table (posicao int, nome text, trofeus int, eu boolean, visitante boolean)
language sql
stable
security definer
set search_path = public
as $$
  with quem as (
    select public.is_treinador() as treinador, (select id from alunos where profile_id = auth.uid()) as meu
  ),
  contagem as (
    select c.aluno_id, count(distinct c.codigo)::int as n from conquistas_aluno c
    where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido')
    group by c.aluno_id
  ),
  base as (
    select a.id, a.modalidade, coalesce(nullif(btrim(p.nome), ''), 'Aluno') as nome_completo, k.n
    from alunos a
    join contagem k on k.aluno_id = a.id
    left join profiles p on p.id = a.profile_id
    cross join quem
    where auth.uid() is not null
      and (quem.treinador or quem.meu is not null)
      and a.status = 'ativo'
      and k.n > 0
      and (a.ranking_visivel or a.id = quem.meu or quem.treinador)
  )
  select dense_rank() over (order by b.n desc)::int,
         case when (select treinador from quem) then b.nome_completo
              else split_part(b.nome_completo, ' ', 1)
                   || coalesce(' ' || nullif(left(regexp_replace(b.nome_completo, '^.*\s', ''), 1), left(split_part(b.nome_completo, ' ', 1), 1)) || '.', '')
         end,
         b.n,
         b.id = (select meu from quem),
         b.modalidade = 'visitante'
  from base b
  order by 1, 2;
$$;
revoke all on function public.ranking_trofeus() from public, anon;
grant execute on function public.ranking_trofeus() to authenticated;
