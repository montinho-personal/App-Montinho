-- ============================================================================
-- 0151 — A liderança do ranking só muda no FIM DO DIA (pedido do Montinho,
-- 09/11/2026: “a pessoa só perde a liderança no final do dia; empatou agora,
-- tem que esperar terminar o dia para ver se ela fica”).
--   • ranking_topo(dia) = quem SEGURA a coroa naquele dia de Brasília.
--   • A partir das 23h50 (cron a cada 5 min) decide-se quem segura amanhã:
--     o 1º lugar do fim do dia; no EMPATE de troféus, quem já é o líder fica.
--   • Durante o dia a coroa não muda (se o dia começou sem dono — 1ª vez ou
--     depois de uma falha —, o 1º lugar daquele momento assume).
--   • Na lista do ranking, no empate de troféus o líder do dia fica na frente.
--   • Avisos no celular (assumiu / perdeu / dia N no topo) saem no dia em que
--     a coroa muda de fato, a partir das 7h.
-- Troféus Topo Firme/Inabalável/Lenda: dias seguidos segurando a coroa (igual).
-- ============================================================================

-- Quem segura a coroa hoje (dia de Brasília); null = ninguém ainda.
create or replace function public.ranking_lider_do_dia()
returns uuid language sql stable security definer set search_path = public as $$
  select aluno_id from ranking_topo where dia = (now() at time zone 'America/Sao_Paulo')::date;
$$;
revoke all on function public.ranking_lider_do_dia() from public, anon;
grant execute on function public.ranking_lider_do_dia() to authenticated;

-- 1º lugar AGORA; no empate de troféus, o líder do dia fica na frente.
create or replace function public.ranking_lider_publico()
returns uuid language sql stable security definer set search_path = public as $$
  with contagem as (
    select k.aluno_id, count(*)::int as n, max(k.primeira) as chegou_em
      from (select c.aluno_id, c.codigo, min(c.conquistado_em) as primeira from conquistas_aluno c
             where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000', 'retomada_30', 'primeiro_wod', 'primeiro_benchmark', 'superando_recorde', 'primeira_hyrox', 'primeiro_funcional', 'semana_multimodalidade', 'evolucao_sem_fronteiras', 'topo_ranking', 'topo_5_dias', 'topo_10_dias', 'topo_30_dias') group by c.aluno_id, c.codigo) k
     group by k.aluno_id
  ), dono as (select public.ranking_lider_do_dia() as id)
  select a.id
    from alunos a
    join contagem k on k.aluno_id = a.id
    left join profiles p on p.id = a.profile_id
    left join ranking_desempate d on d.aluno_id = a.id
    cross join dono
   where a.status = 'ativo' and k.n > 0 and a.ranking_visivel and p.role is distinct from 'treinador'
   order by k.n desc, (a.id is not distinct from dono.id) desc, coalesce(d.pct_semana, -1) desc, coalesce(d.carimbos, 0) desc, coalesce(d.semanas_seguidas, 0) desc, coalesce(d.pct_4sem, -1) desc, k.chegou_em asc, a.id
   limit 1;
$$;

create or replace function public.registrar_topo_ranking_interno()
returns void language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  agora_sp timestamp := now() at time zone 'America/Sao_Paulo';
  sete timestamptz := (hoje + time '07:00') at time zone 'America/Sao_Paulo';
  lider uuid;
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
  -- 1) Quem segura a coroa hoje. Se o dia começou sem dono, o 1º lugar de agora assume.
  select aluno_id into lider from ranking_topo where dia = hoje;
  if lider is null then
    lider := public.ranking_lider_publico();
    if lider is null then return; end if;
    insert into ranking_topo (dia, aluno_id, atualizado_em) values (hoje, lider, now())
      on conflict (dia) do nothing;
    select aluno_id into lider from ranking_topo where dia = hoje;
  end if;

  -- 2) Fechamento do dia (23h50 em diante): quem fica com a coroa amanhã.
  --    No empate de troféus, o líder de hoje fica (ranking_lider_publico já desempata assim).
  if agora_sp::time >= time '23:50' then
    insert into ranking_topo (dia, aluno_id, atualizado_em)
    select hoje + 1, l, now() from (select public.ranking_lider_publico() as l) x where x.l is not null
      on conflict (dia) do update set aluno_id = excluded.aluno_id, atualizado_em = now();
  end if;

  -- 3) Dias seguidos com a coroa até HOJE (a linha de amanhã não conta) e troféus.
  with recursive seq as (
    select hoje as dia
    union all
    select s.dia - 1 from seq s join ranking_topo t on t.dia = s.dia - 1 and t.aluno_id = lider
  )
  select min(dia), count(*)::int into inicio, dias from seq;
  for marco in select * from (values (5, 'topo_5_dias', 'Topo Firme'), (10, 'topo_10_dias', 'Topo Inabalável'), (30, 'topo_30_dias', 'Lenda do Topo')) v(n, codigo, titulo) loop
    if dias >= marco.n then
      insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo, descricao, dados, evidencia, origem)
      values (lider, marco.codigo, '1', now(), marco.titulo,
              marco.n || ' dias seguidos em 1º lugar no ranking de troféus (desde ' || to_char(inicio, 'DD/MM') || ').',
              jsonb_build_object('dias', marco.n, 'desde', inicio), jsonb_build_object('dias', dias, 'desde', inicio), 'app')
      on conflict (aluno_id, codigo, referencia) do nothing;
    end if;
  end loop;

  -- 4) Aviso do dia para quem tem a coroa (1 por dia; a partir das 7h, os de rotina ao meio-dia).
  select a.profile_id into v_prof from alunos a where a.id = lider;
  select * into prox from (values (5, 'Topo Firme'), (10, 'Topo Inabalável'), (30, 'Lenda do Topo')) v(n, titulo)
   where v.n > dias and not exists (select 1 from conquistas_aluno c where c.aluno_id = lider and c.codigo = 'topo_' || v.n || '_dias')
   order by v.n limit 1;
  v_titulo := null;
  if dias = 1 then
    v_titulo := '👑 Você assumiu o 1º lugar do ranking!';
    v_corpo := case when prox.n is not null then 'Segure o topo por ' || prox.n || ' dias seguidos e ganhe o troféu ' || prox.titulo || '. A liderança só muda no fim do dia: cada treino conta!' else 'Você está no topo de novo. Bora segurar!' end;
  elsif dias in (5, 10, 30) then
    v_titulo := '🏆 ' || case dias when 5 then 'Topo Firme' when 10 then 'Topo Inabalável' else 'Lenda do Topo' end || ' conquistado!';
    v_corpo := dias || ' dias seguidos em 1º lugar. ' || case when prox.n is not null then 'Próximo: ' || prox.titulo || ' com ' || prox.n || ' dias.' else 'Você é lenda. Siga inspirando a galera!' end;
  elsif prox.n is not null and prox.n - dias = 1 then
    v_titulo := '🔥 Amanhã tem troféu: ' || prox.titulo;
    v_corpo := 'Você está há ' || dias || ' dias em 1º lugar. Termine o dia na frente e o troféu é seu!';
  elsif prox.n is not null then
    v_titulo := '👑 Dia ' || dias || ' no topo do ranking';
    v_corpo := 'Faltam ' || (prox.n - dias) || ' dias para o troféu ' || prox.titulo || '. A liderança é decidida no fim do dia: treine hoje!';
  elsif dias % 7 = 0 then
    v_titulo := '👑 ' || dias || ' dias no topo!';
    v_corpo := 'Você segue em 1º lugar. A galera está de olho: bora manter!';
  end if;
  if v_prof is not null and v_titulo is not null then
    v_quando := case when dias = 1 or dias in (5, 10, 30) then greatest(now(), sete)
                     when agora_sp::time >= time '12:00' then now()
                     else (hoje + time '12:00') at time zone 'America/Sao_Paulo' end;
    insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
    values (v_prof, 'desafio', left('topo:' || lider || ':' || hoje, 120), v_quando, (hoje + time '21:30') at time zone 'America/Sao_Paulo',
            jsonb_build_object('titulo', left(v_titulo, 120), 'corpo', left(v_corpo, 300), 'url', '/aluno/ranking'))
    on conflict (dedupe) do nothing;
  end if;

  -- 5) Quem segurava ontem e não segura hoje: aviso para recuperar.
  select aluno_id into antes from ranking_topo where dia = hoje - 1;
  if antes is not null and antes <> lider then
    select a.profile_id into v_prof from alunos a where a.id = antes and a.status = 'ativo';
    if v_prof is not null then
      insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
      values (v_prof, 'desafio', left('topo-perdeu:' || antes || ':' || hoje, 120), greatest(now(), sete), (hoje + time '21:30') at time zone 'America/Sao_Paulo',
              jsonb_build_object('titulo', 'Alguém passou você no ranking 😮', 'corpo', 'Ontem terminou com outra pessoa em 1º lugar, mas a diferença é pequena. Bora recuperar o topo até o fim do dia?', 'url', '/aluno/ranking'))
      on conflict (dedupe) do nothing;
    end if;
  end if;
end;
$$;

-- Lista do ranking: no empate de troféus, o líder do dia fica na frente.
create or replace function public.ranking_trofeus_v3()
returns table(posicao integer, nome text, trofeus integer, eu boolean, visitante boolean, aderencia_semana integer, mesmo_total_acima boolean, ref uuid)
language sql stable security definer set search_path = public as $$
  with quem as (
    select public.is_treinador() as treinador, (select id from alunos where profile_id = auth.uid()) as meu, public.ranking_lider_do_dia() as dono
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
           d.pct_semana, coalesce(d.carimbos, 0) as carimbos, coalesce(d.semanas_seguidas, 0) as seguidas, d.pct_4sem,
           (a.id is not distinct from quem.dono) as dono
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
           rank() over (order by b.n desc, b.dono desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as pos,
           lag(b.n) over (order by b.n desc, b.dono desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as n_acima
    from base b
  )
  select o.pos::int,
         case when (select treinador from quem) then o.nome_completo
              else public.nome_curto(o.nome_completo)
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
