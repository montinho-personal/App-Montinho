-- ============================================================================
-- 0139 — Troféu “Passei o Montinho” (pedido do Montinho, 01/11/2026): quem
-- fica à frente do Montinho no ranking de troféus (a ficha dele no “Meu
-- treino”, que continua FORA do ranking oficial; mesma ordem de desempate da
-- montinho_no_ranking) ganha o troféu uma vez + aviso no celular (canal dos
-- desafios). Conta no ranking como os outros troféus. Concedido por
-- conceder_passou_montinho(), chamada junto da conferência do Topo do Ranking
-- (ao abrir o Ranking e pelo cron a cada 5 min). Espelho em
-- src/lib/conquistas/topo-ranking.ts. Idempotente.
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
  'topo_ranking','topo_5_dias','topo_10_dias','topo_30_dias',
  'passou_montinho'));

create or replace function public.conceder_passou_montinho()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    with m as (
      select a.id from alunos a join profiles p on p.id = a.profile_id where p.role = 'treinador' order by a.created_at limit 1
    ),
    contagem as (
      select k.aluno_id, count(*)::int as n, max(k.primeira) as chegou_em
        from (select c.aluno_id, c.codigo, min(c.conquistado_em) as primeira from conquistas_aluno c
               where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000', 'retomada_30', 'primeiro_wod', 'primeiro_benchmark', 'superando_recorde', 'primeira_hyrox', 'primeiro_funcional', 'semana_multimodalidade', 'evolucao_sem_fronteiras', 'topo_ranking', 'topo_5_dias', 'topo_10_dias', 'topo_30_dias') group by c.aluno_id, c.codigo) k
       group by k.aluno_id
    ),
    chave as (
      select a.id, a.profile_id, k.n, coalesce(d.pct_semana, -1) as ps, coalesce(d.carimbos, 0) as car, coalesce(d.semanas_seguidas, 0) as seg, coalesce(d.pct_4sem, -1) as p4, k.chegou_em
        from alunos a join contagem k on k.aluno_id = a.id left join ranking_desempate d on d.aluno_id = a.id
       where a.status = 'ativo'
    ),
    mm as (select c.* from chave c where c.id = (select id from m))
    select c.id, c.profile_id
      from chave c cross join mm
     where c.id <> mm.id
       and exists (select 1 from alunos a left join profiles p on p.id = a.profile_id where a.id = c.id and p.role is distinct from 'treinador')
       and (row(c.n, c.ps, c.car, c.seg, c.p4) > row(mm.n, mm.ps, mm.car, mm.seg, mm.p4)
            or (row(c.n, c.ps, c.car, c.seg, c.p4) = row(mm.n, mm.ps, mm.car, mm.seg, mm.p4) and c.chegou_em < mm.chegou_em))
       and not exists (select 1 from conquistas_aluno x where x.aluno_id = c.id and x.codigo = 'passou_montinho')
  loop
    insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo, descricao, dados, evidencia, origem)
    values (r.id, 'passou_montinho', '1', now(), 'Passei o Montinho', 'Passou o Montinho no ranking de troféus.', '{}'::jsonb, '{}'::jsonb, 'app')
    on conflict (aluno_id, codigo, referencia) do nothing;
    if r.profile_id is not null then
      insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
      values (r.profile_id, 'desafio', 'montinho:' || r.id, now(), now() + interval '2 days',
              jsonb_build_object('titulo', '🏆 Você passou o Montinho no ranking!', 'corpo', 'Troféu “Passei o Montinho” desbloqueado. Agora segura essa posição!', 'url', '/aluno/ranking'))
      on conflict (dedupe) do nothing;
    end if;
  end loop;
end;
$$;
revoke all on function public.conceder_passou_montinho() from public, anon, authenticated;

create or replace function public.registrar_topo_ranking()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'não autorizado'; end if;
  perform public.registrar_topo_ranking_interno();
  perform public.conceder_passou_montinho();
end;
$$;
revoke all on function public.registrar_topo_ranking() from public, anon;
grant execute on function public.registrar_topo_ranking() to authenticated;

create or replace function public.registrar_topo_ranking_agendador(p_chave text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  perform public.registrar_topo_ranking_interno();
  perform public.conceder_passou_montinho();
end;
$$;
revoke all on function public.registrar_topo_ranking_agendador(text) from public, authenticated;
grant execute on function public.registrar_topo_ranking_agendador(text) to anon;
