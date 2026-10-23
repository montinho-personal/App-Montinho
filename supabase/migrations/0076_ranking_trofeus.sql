-- ============================================================================
-- 0076 — Ranking de troféus (alunos e visitantes) + medalha “Protocolo completo”.
-- O aluno não lê conquistas de outros: o ranking sai desta função, que devolve
-- só primeiro nome + inicial, a quantidade de troféus diferentes e a posição.
-- Quem não quiser aparecer desliga em Perfil (alunos.ranking_visivel).
-- ============================================================================
alter table alunos add column if not exists ranking_visivel boolean not null default true;

alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido'));

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
    select c.aluno_id, count(distinct c.codigo)::int as n from conquistas_aluno c group by c.aluno_id
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

create or replace function public.definir_ranking_visivel(p_visivel boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return false; end if;
  update alunos set ranking_visivel = coalesce(p_visivel, true) where profile_id = auth.uid();
  return found;
end $$;
revoke all on function public.definir_ranking_visivel(boolean) from public, anon;
grant execute on function public.definir_ranking_visivel(boolean) to authenticated;
