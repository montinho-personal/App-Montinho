-- ============================================================================
-- 0138 — Topo do Ranking (pedido do Montinho, 01/11/2026): chegar ao 1º lugar
-- NÃO dá troféu — só avisa o personal (o app lê ranking_topo e põe no
-- Celebrar). Troféu é para quem SEGURA o topo: “Topo Firme” (5 dias
-- seguidos), “Topo Inabalável” (10) e “Lenda do Topo” (30, lendário).
-- O código 'topo_ranking' fica aceito/fora do ranking só por reserva (nunca é
-- concedido).
--   • ranking_topo: 1 linha por dia de Brasília com quem estava em 1º (a
--     última conferência do dia vale). Só leitura: o personal vê tudo, o aluno
--     só os dias dele. Ninguém grava direto.
--   • ranking_lider_publico(): o 1º do ranking OFICIAL (ativos, “aparecer no
--     ranking” ligado; a ficha do personal fica fora), mesma ordem de
--     desempate da ranking_trofeus_v3.
--   • registrar_topo_ranking() (qualquer login, ao abrir o Ranking) e
--     registrar_topo_ranking_agendador(p_chave) (cron api/cron/lembretes, a
--     cada 5 min): anotam o líder de hoje e concedem os troféus dos dias seguidos.
--   • Lembretes no celular (canal dos desafios, 1 por dia): quem assume o
--     topo é avisado na hora (“segure por 5 dias e ganhe…”); quem está no topo
--     recebe ao meio-dia quanto falta para o próximo troféu (“amanhã tem
--     troféu”, “conquistado!”); quem perde o topo recebe o convite para
--     recuperar.
--   • Os troféus do topo ficam FORA da contagem do ranking (senão o líder ganharia
--     troféu por ser líder e ninguém mais alcançaria): ranking_trofeus_v2/v3 e
--     montinho_no_ranking recriadas com a lista nova (espelho FORA_DO_RANKING
--     em src/lib/ranking/trofeus.ts). Regras espelhadas em
--     src/lib/conquistas/topo-ranking.ts. Idempotente.
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo','criador_desafios','campeao_desafio','palavra_cumprida','desafiante_nato',
  'cardio_1','cardio_2','cardio_3','cardio_10','cardio_25','cardio_50','cardio_100','cardio_250','cardio_500','cardio_1000','cardio_uma_hora','cardio_semana_ritmo','cardio_meta_semana','cardio_4_semanas','cardio_voltei','cardio_folego_extra','cardio_dobro','dois_folegos','combo_completo','dose_dupla','combo_3','combo_5','combo_7','combo_10','combo_30','series_500','series_1000',
  'acompanhamento_3_meses','acompanhamento_6_meses','acompanhamento_1_ano','retomada_30','quiz_1','quiz_10','quiz_30','quiz_50','semana_compartilhada','cards_10','cards_20','cards_30','trofeus_compartilhados_10','trofeus_compartilhados_20','trofeus_compartilhados_30','trofeus_compartilhados_50','cardio_madrugada','cardio_4h','cardio_meia_noite','cardio_10km','cardio_escada_1h',
  'mobilidade_superiores','mobilidade_inferiores','mobilidade_completa','mobilidade_7_superiores','mobilidade_7_inferiores',
  'feriado_musculacao','feriado_cardio','feriado_combo',
  'monitoramento_4','monitoramento_8','monitoramento_12','monitoramento_26',
  'semanas_completas_5','semanas_completas_10','semanas_completas_25','semanas_completas_50','semana_perfeita','semana_perfeita_5','semana_perfeita_10',
  'primeiro_wod','primeiro_benchmark','superando_recorde','primeira_hyrox','primeiro_funcional','atleta_versatil','semana_multimodalidade','evolucao_sem_fronteiras',
  'topo_ranking','topo_5_dias','topo_10_dias','topo_30_dias'));

create table if not exists ranking_topo (
  dia date primary key,
  aluno_id uuid not null references alunos(id) on delete cascade,
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_ranking_topo_aluno on ranking_topo(aluno_id, dia desc);
alter table ranking_topo enable row level security;
drop policy if exists ranking_topo_ler on ranking_topo;
create policy ranking_topo_ler on ranking_topo for select using (public.is_treinador() or aluno_id = public.aluno_id_atual());

-- O 1º do ranking oficial (o que os alunos veem), sem olhar quem chama.
create or replace function public.ranking_lider_publico()
returns uuid language sql stable security definer set search_path = public as $$
  with contagem as (
    select k.aluno_id, count(*)::int as n, max(k.primeira) as chegou_em
      from (select c.aluno_id, c.codigo, min(c.conquistado_em) as primeira from conquistas_aluno c
             where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000', 'retomada_30', 'primeiro_wod', 'primeiro_benchmark', 'superando_recorde', 'primeira_hyrox', 'primeiro_funcional', 'semana_multimodalidade', 'evolucao_sem_fronteiras', 'topo_ranking', 'topo_5_dias', 'topo_10_dias', 'topo_30_dias') group by c.aluno_id, c.codigo) k
     group by k.aluno_id
  )
  select a.id
    from alunos a
    join contagem k on k.aluno_id = a.id
    left join profiles p on p.id = a.profile_id
    left join ranking_desempate d on d.aluno_id = a.id
   where a.status = 'ativo' and k.n > 0 and a.ranking_visivel and p.role is distinct from 'treinador'
   order by k.n desc, coalesce(d.pct_semana, -1) desc, coalesce(d.carimbos, 0) desc, coalesce(d.semanas_seguidas, 0) desc, coalesce(d.pct_4sem, -1) desc, k.chegou_em asc, a.id
   limit 1;
$$;
revoke all on function public.ranking_lider_publico() from public, anon, authenticated;

create or replace function public.registrar_topo_ranking_interno()
returns void language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  agora_sp timestamp := now() at time zone 'America/Sao_Paulo';
  lider uuid := public.ranking_lider_publico();
  antes uuid;
  inicio date;
  dias int;
  marco record;
  prox record;
  v_prof uuid;
  v_titulo text;
  v_corpo text;
  v_quando timestamptz;
begin
  if lider is null then return; end if;
  -- Quem estava no topo antes desta conferência (hoje mais cedo, senão ontem).
  select aluno_id into antes from ranking_topo where dia = hoje;
  if antes is null then select aluno_id into antes from ranking_topo where dia = hoje - 1; end if;
  insert into ranking_topo (dia, aluno_id, atualizado_em) values (hoje, lider, now())
    on conflict (dia) do update set aluno_id = excluded.aluno_id, atualizado_em = now();
  -- Dias seguidos no topo terminando hoje.
  with recursive seq as (
    select hoje as dia
    union all
    select s.dia - 1 from seq s join ranking_topo t on t.dia = s.dia - 1 and t.aluno_id = lider
  )
  select min(dia), count(*)::int into inicio, dias from seq;
  -- Segurou o topo: 5, 10 e 30 dias seguidos (cada um vale uma vez).
  for marco in select * from (values (5, 'topo_5_dias', 'Topo Firme'), (10, 'topo_10_dias', 'Topo Inabalável'), (30, 'topo_30_dias', 'Lenda do Topo')) v(n, codigo, titulo) loop
    if dias >= marco.n then
      insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo, descricao, dados, evidencia, origem)
      values (lider, marco.codigo, '1', now(), marco.titulo,
              marco.n || ' dias seguidos em 1º lugar no ranking de troféus (desde ' || to_char(inicio, 'DD/MM') || ').',
              jsonb_build_object('dias', marco.n, 'desde', inicio), jsonb_build_object('dias', dias, 'desde', inicio), 'app')
      on conflict (aluno_id, codigo, referencia) do nothing;
    end if;
  end loop;

  -- Lembretes no celular para quem está no topo (canal dos desafios, 0095:
  -- respeita “motivacionais”, silêncio e a chave geral). 1 por dia: no dia em
  -- que assume sai na hora; nos outros, ao meio-dia. Textos espelhados em
  -- src/lib/conquistas/topo-ranking.ts (lembreteDoTopo).
  select a.profile_id into v_prof from alunos a where a.id = lider;
  select * into prox from (values (5, 'Topo Firme'), (10, 'Topo Inabalável'), (30, 'Lenda do Topo')) v(n, titulo)
   where v.n > dias and not exists (select 1 from conquistas_aluno c where c.aluno_id = lider and c.codigo = 'topo_' || v.n || '_dias')
   order by v.n limit 1;
  if dias = 1 then
    v_titulo := '👑 Você assumiu o 1º lugar do ranking!';
    v_corpo := case when prox.n is not null then 'Segure o topo por ' || prox.n || ' dias seguidos e ganhe o troféu ' || prox.titulo || '. Cada treino conta!' else 'Você está no topo de novo. Bora segurar!' end;
  elsif dias in (5, 10, 30) then
    v_titulo := '🏆 ' || case dias when 5 then 'Topo Firme' when 10 then 'Topo Inabalável' else 'Lenda do Topo' end || ' conquistado!';
    v_corpo := dias || ' dias seguidos em 1º lugar. ' || case when prox.n is not null then 'Próximo: ' || prox.titulo || ' com ' || prox.n || ' dias.' else 'Você é lenda. Siga inspirando a galera!' end;
  elsif prox.n is not null and prox.n - dias = 1 then
    v_titulo := '🔥 Amanhã tem troféu: ' || prox.titulo;
    v_corpo := 'Você está há ' || dias || ' dias em 1º lugar. Segure o topo até amanhã e o troféu é seu!';
  elsif prox.n is not null then
    v_titulo := '👑 Dia ' || dias || ' no topo do ranking';
    v_corpo := 'Faltam ' || (prox.n - dias) || ' dias para o troféu ' || prox.titulo || '. Treine hoje para não perder a posição!';
  elsif dias % 7 = 0 then
    v_titulo := '👑 ' || dias || ' dias no topo!';
    v_corpo := 'Você segue em 1º lugar. A galera está de olho: bora manter!';
  end if;
  if v_prof is not null and v_titulo is not null then
    v_quando := case when dias = 1 or agora_sp::time >= time '12:00' then now() else (hoje + time '12:00') at time zone 'America/Sao_Paulo' end;
    insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
    values (v_prof, 'desafio', left('topo:' || lider || ':' || hoje, 120), v_quando, (hoje + time '21:30') at time zone 'America/Sao_Paulo',
            jsonb_build_object('titulo', left(v_titulo, 120), 'corpo', left(v_corpo, 300), 'url', '/aluno/ranking'))
    on conflict (dedupe) do nothing;
  end if;

  -- Quem perdeu o topo recebe o convite para recuperar (1 por dia).
  if antes is not null and antes <> lider then
    select a.profile_id into v_prof from alunos a where a.id = antes and a.status = 'ativo';
    if v_prof is not null then
      insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
      values (v_prof, 'desafio', left('topo-perdeu:' || antes || ':' || hoje, 120), now(), (hoje + time '21:30') at time zone 'America/Sao_Paulo',
              jsonb_build_object('titulo', 'Alguém passou você no ranking 😮', 'corpo', 'Você saiu do 1º lugar, mas a diferença é pequena. Bora recuperar o topo?', 'url', '/aluno/ranking'))
      on conflict (dedupe) do nothing;
    end if;
  end if;
end;
$$;
revoke all on function public.registrar_topo_ranking_interno() from public, anon, authenticated;

-- Ao abrir o Ranking (aluno, visitante ou personal logado).
create or replace function public.registrar_topo_ranking()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'não autorizado'; end if;
  perform public.registrar_topo_ranking_interno();
end;
$$;
revoke all on function public.registrar_topo_ranking() from public, anon;
grant execute on function public.registrar_topo_ranking() to authenticated;

-- Pelo agendador (cron api/cron/lembretes), com a chave dele.
create or replace function public.registrar_topo_ranking_agendador(p_chave text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  perform public.registrar_topo_ranking_interno();
end;
$$;
revoke all on function public.registrar_topo_ranking_agendador(text) from public, authenticated;
grant execute on function public.registrar_topo_ranking_agendador(text) to anon;

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
      where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000', 'retomada_30', 'primeiro_wod', 'primeiro_benchmark', 'superando_recorde', 'primeira_hyrox', 'primeiro_funcional', 'semana_multimodalidade', 'evolucao_sem_fronteiras', 'topo_ranking', 'topo_5_dias', 'topo_10_dias', 'topo_30_dias')
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
      where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000', 'retomada_30', 'primeiro_wod', 'primeiro_benchmark', 'superando_recorde', 'primeira_hyrox', 'primeiro_funcional', 'semana_multimodalidade', 'evolucao_sem_fronteiras', 'topo_ranking', 'topo_5_dias', 'topo_10_dias', 'topo_30_dias')
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
  with fora as (select unnest(array['recorde','eu_voltei','desafio_concluido','cardio_voltei','cardio_500','cardio_1000','retomada_30','primeiro_wod','primeiro_benchmark','superando_recorde','primeira_hyrox','primeiro_funcional','semana_multimodalidade','evolucao_sem_fronteiras','topo_ranking','topo_5_dias','topo_10_dias','topo_30_dias']) as c),
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
