-- ============================================================================
-- 0136 — Troféus da Multimodalidade (fase 5, aprovada pelo Montinho em
-- 30/10/2026), aceitos em conquistas_aluno:
--   primeiro_wod, primeira_hyrox, primeiro_funcional, primeiro_benchmark,
--   superando_recorde, atleta_versatil, semana_multimodalidade,
--   evolucao_sem_fronteiras.
-- Regras no app (src/lib/conquistas/multimodalidade.ts); gravados só pelo
-- servidor (0124). Ranking: só o Atleta Versátil conta; os outros ficam de
-- fora como o recorde (espelho FORA_DO_RANKING em src/lib/ranking/trofeus.ts)
-- — ranking_trofeus_v2/v3 e montinho_no_ranking recriadas com a lista nova,
-- o resto igual. Idempotente.
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo','criador_desafios','campeao_desafio','palavra_cumprida','desafiante_nato',
  'cardio_1','cardio_2','cardio_3','cardio_10','cardio_25','cardio_50','cardio_100','cardio_250','cardio_500','cardio_1000','cardio_uma_hora','cardio_semana_ritmo','cardio_meta_semana','cardio_4_semanas','cardio_voltei','cardio_folego_extra','cardio_dobro','dois_folegos','combo_completo','dose_dupla','combo_3','combo_5','combo_7','combo_10','combo_30','series_500','series_1000',
  'acompanhamento_3_meses','acompanhamento_6_meses','acompanhamento_1_ano','retomada_30','quiz_1','quiz_10','quiz_30','quiz_50','semana_compartilhada','cards_10','cards_20','cards_30','trofeus_compartilhados_10','trofeus_compartilhados_20','trofeus_compartilhados_30','trofeus_compartilhados_50','cardio_madrugada','cardio_4h','cardio_meia_noite','cardio_10km','cardio_escada_1h',
  'mobilidade_superiores','mobilidade_inferiores','mobilidade_completa','mobilidade_7_superiores','mobilidade_7_inferiores',
  'feriado_musculacao','feriado_cardio','feriado_combo',
  'monitoramento_4','monitoramento_8','monitoramento_12','monitoramento_26',
  'semanas_completas_5','semanas_completas_10','semanas_completas_25','semanas_completas_50','semana_perfeita','semana_perfeita_5','semana_perfeita_10',
  'primeiro_wod','primeiro_benchmark','superando_recorde','primeira_hyrox','primeiro_funcional','atleta_versatil','semana_multimodalidade','evolucao_sem_fronteiras'));

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
      where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000', 'retomada_30', 'primeiro_wod', 'primeiro_benchmark', 'superando_recorde', 'primeira_hyrox', 'primeiro_funcional', 'semana_multimodalidade', 'evolucao_sem_fronteiras')
      group by c.aluno_id, c.codigo
    ) k
    group by k.aluno_id
  ),
  base as (
    select a.id, a.modalidade, coalesce(nullif(btrim(p.nome), ''), 'Aluno') as nome_completo, k.n, k.chegou_em,
           d.pct_semana, coalesce(d.carimbos, 0) as carimbos, coalesce(d.semanas_seguidas, 0) as seguidas, d.pct_4sem
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
           rank() over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as pos,
           lag(b.n) over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as n_acima
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

create or replace function public.ranking_trofeus_v3()
returns table (posicao int, nome text, trofeus int, eu boolean, visitante boolean, aderencia_semana int, mesmo_total_acima boolean, ref uuid)
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
      where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000', 'retomada_30', 'primeiro_wod', 'primeiro_benchmark', 'superando_recorde', 'primeira_hyrox', 'primeiro_funcional', 'semana_multimodalidade', 'evolucao_sem_fronteiras')
      group by c.aluno_id, c.codigo
    ) k
    group by k.aluno_id
  ),
  base as (
    select a.id, a.modalidade, coalesce(nullif(btrim(p.nome), ''), 'Aluno') as nome_completo, k.n, k.chegou_em,
           d.pct_semana, coalesce(d.carimbos, 0) as carimbos, coalesce(d.semanas_seguidas, 0) as seguidas, d.pct_4sem
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
           rank() over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as pos,
           lag(b.n) over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as n_acima
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
         coalesce(o.n_acima = o.n, false),
         o.id
  from ordenado o
  order by 1, 2;
$$;
revoke all on function public.ranking_trofeus_v3() from public, anon;
grant execute on function public.ranking_trofeus_v3() to authenticated;

create or replace function public.montinho_no_ranking()
returns jsonb language sql stable security definer set search_path = public as $$
  with fora as (select unnest(array['recorde','eu_voltei','desafio_concluido','cardio_voltei','cardio_500','cardio_1000','retomada_30','primeiro_wod','primeiro_benchmark','superando_recorde','primeira_hyrox','primeiro_funcional','semana_multimodalidade','evolucao_sem_fronteiras']) as c),
  m as (
    select a.id from alunos a join profiles p on p.id = a.profile_id
     where p.role = 'treinador' order by a.created_at limit 1
  ),
  contagem as (
    select k.aluno_id, count(*)::int as n, max(k.primeira) as chegou_em
      from (select c.aluno_id, c.codigo, min(c.conquistado_em) as primeira from conquistas_aluno c
             where c.codigo not in (select c from fora) group by c.aluno_id, c.codigo) k
     group by k.aluno_id
  ),
  base as (
    select a.id, k.n, k.chegou_em, d.pct_semana, coalesce(d.carimbos, 0) as carimbos, coalesce(d.semanas_seguidas, 0) as seguidas, d.pct_4sem
      from alunos a join contagem k on k.aluno_id = a.id left join ranking_desempate d on d.aluno_id = a.id
     where a.status = 'ativo' and k.n > 0 and (a.ranking_visivel or a.id = (select id from m))
  ),
  ordenado as (
    select b.*, rank() over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as pos
      from base b
  )
  select case when auth.uid() is null or (public.aluno_id_atual() is null and not public.is_treinador()) or (select id from m) is null then null else
    jsonb_build_object(
      'posicao', (select o.pos from ordenado o where o.id = (select id from m)),
      'total', (select count(*) from ordenado),
      'trofeus', coalesce((select o.n from ordenado o where o.id = (select id from m)), 0),
      'carimbos', coalesce((select d.carimbos from ranking_desempate d where d.aluno_id = (select id from m)), 0),
      'semanas_seguidas', coalesce((select d.semanas_seguidas from ranking_desempate d where d.aluno_id = (select id from m)), 0),
      'recentes', coalesce((select jsonb_agg(x.codigo) from (select c.codigo, min(c.conquistado_em) as em from conquistas_aluno c where c.aluno_id = (select id from m) group by c.codigo order by 2 desc limit 3) x), '[]'::jsonb)
    ) end;
$$;
revoke all on function public.montinho_no_ranking() from public, anon;
grant execute on function public.montinho_no_ranking() to authenticated;
