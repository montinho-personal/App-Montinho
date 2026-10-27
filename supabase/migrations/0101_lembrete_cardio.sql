-- ============================================================================
-- 0101 — Lembrete de cardio no celular (pedido do Montinho em 28/10/2026).
-- Mesmo caminho do Chalalá (0036) e dos desafios (0095): o banco decide
-- quando e para quem; o cron (api/cron/lembretes) monta o texto
-- (src/lib/push/cardio.ts) e entrega. Depende de 0098.
-- Regras:
--   • só para quem tem cardio prescrito ativo (pelo personal ou o próprio
--     cardio do visitante) e aluno ativo; visitante só com acesso em dia;
--   • entre 17h e 20h59 no fuso da pessoa, fora do horário de silêncio;
--   • não manda se já fez cardio hoje (registro, extra de cardio ou Strava),
--     se a meta da semana já foi batida (sessões OU minutos), se tem treino
--     em andamento, se contou dor/desconforto nos últimos 2 dias, ou se
--     recebeu outra notificação nas últimas 3 h;
--   • prescrição com dias marcados: só nesses dias (nos 2 últimos dias da
--     semana vale qualquer dia, para fechar a meta);
--   • no máximo 1 por dia e 3 por semana; respeita “motivacionais” e a chave
--     geral do Chalalá (notificacao_config.chalala_ativo).
-- ============================================================================
alter table notificacoes_envios drop constraint if exists notificacoes_envios_categoria_check;
alter table notificacoes_envios add constraint notificacoes_envios_categoria_check check (categoria in ('bom_dia', 'pos_treino', 'teste', 'desafio', 'cardio'));

create or replace function public.cardio_notificacoes_devidas(p_chave text)
returns table (envio_id uuid, dados jsonb, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare
  cfg notificacao_config%rowtype;
  ids uuid[];
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  select * into cfg from notificacao_config where id = 1;
  update notificacoes_envios e set status = 'descartada', motivo = 'expirada' where e.categoria = 'cardio' and e.status = 'pendente' and e.expira_em < now();
  if not coalesce(cfg.chalala_ativo, false) then return; end if;

  with base as (
    select a.id as aluno_id, a.profile_id, a.modalidade as tipo_aluno,
           coalesce(np.fuso, 'America/Sao_Paulo') as fuso,
           coalesce(np.motivacionais, true) as motivacionais,
           split_part(coalesce(nullif(btrim(p.nome), ''), ''), ' ', 1) as primeiro_nome
      from alunos a
      join profiles p on p.id = a.profile_id
      left join notificacao_preferencias np on np.profile_id = a.profile_id
     where a.status = 'ativo'
       and exists (select 1 from cardio_prescricoes c where c.aluno_id = a.id and c.ativo)
       and exists (select 1 from push_inscricoes d where d.profile_id = a.profile_id and d.ativo)
  ),
  hora as (
    select b.*, (now() at time zone b.fuso) as agora_local, (now() at time zone b.fuso)::date as hoje
      from base b
  ),
  semana as (
    select h.*,
           (date_trunc('week', h.hoje))::date as seg,
           -- dias que faltam na semana contando hoje (segunda = 7 … domingo = 1)
           7 - ((extract(isodow from h.hoje))::int - 1) as dias_restantes
      from hora h
     where extract(hour from h.agora_local) between 17 and 20
       and h.motivacionais
  ),
  alvo as (
    select s.*,
           (select sum(coalesce(c.minutos_semana, c.frequencia_semanal * c.duracao_min)) from cardio_prescricoes c where c.aluno_id = s.aluno_id and c.ativo) as alvo_min,
           (select least(7, sum(c.frequencia_semanal)) from cardio_prescricoes c where c.aluno_id = s.aluno_id and c.ativo) as alvo_dias,
           (select c.modalidade from cardio_prescricoes c where c.aluno_id = s.aluno_id and c.ativo order by c.created_at desc limit 1) as modalidade,
           (select c.duracao_min from cardio_prescricoes c where c.aluno_id = s.aluno_id and c.ativo order by c.created_at desc limit 1) as duracao_min,
           -- hoje é dia marcado? (prescrição sem dias = qualquer dia)
           exists (select 1 from cardio_prescricoes c where c.aluno_id = s.aluno_id and c.ativo
                    and (cardinality(c.dias) = 0 or (extract(dow from s.hoje))::smallint = any(c.dias))) as dia_marcado
      from semana s
  ),
  feito as (
    -- cardios da semana: registros + extras de cardio + Strava (≥ 10 min), por dia
    select x.aluno_id, x.dia, sum(x.minutos) as minutos
      from (
        select r.aluno_id, r.data as dia, r.duracao_min::numeric as minutos
          from cardio_registros r join alvo a on a.aluno_id = r.aluno_id
         where r.removido_em is null and r.status in ('concluido', 'parcial') and r.data between a.seg and a.hoje
        union all
        select t.aluno_id, (t.iniciado_em at time zone a.fuso)::date, coalesce(t.duracao_seg, 0) / 60.0
          from training_sessions t join alvo a on a.aluno_id = t.aluno_id
         where t.modo = 'extra' and t.status <> 'em_andamento' and coalesce(t.snapshot->'extra'->>'modalidade', '') like 'cardio%'
           and (t.iniciado_em at time zone a.fuso)::date between a.seg and a.hoje
        union all
        select cs.aluno_id, (cs.inicio at time zone a.fuso)::date, cs.duracao_seg / 60.0
          from cardios_strava cs join alvo a on a.aluno_id = cs.aluno_id
         where cs.duracao_seg >= 600 and (cs.inicio at time zone a.fuso)::date between a.seg and a.hoje
      ) x
     group by x.aluno_id, x.dia
  ),
  resumo as (
    select a.*,
           coalesce((select sum(f.minutos) from feito f where f.aluno_id = a.aluno_id), 0) as min_semana,
           coalesce((select count(*) from feito f where f.aluno_id = a.aluno_id and f.minutos >= 10), 0) as dias_semana,
           exists (select 1 from feito f where f.aluno_id = a.aluno_id and f.dia = a.hoje) as fez_hoje
      from alvo a
  ),
  devidos as (
    select r.*
      from resumo r
     where not r.fez_hoje
       and r.min_semana < r.alvo_min
       and r.dias_semana < r.alvo_dias
       and (r.dia_marcado or r.dias_restantes <= 2)
       -- visitante só com acesso em dia
       and (r.tipo_aluno <> 'visitante' or exists (select 1 from acessos_visitante v where v.aluno_id = r.aluno_id and (v.fim is null or v.fim > now())))
       -- treino em andamento agora
       and not exists (select 1 from training_sessions t where t.aluno_id = r.aluno_id and t.status = 'em_andamento')
       -- dor ou desconforto nos últimos 2 dias: o treino cuida, o lembrete não insiste
       and not exists (select 1 from training_sessions t where t.aluno_id = r.aluno_id and t.iniciado_em > now() - interval '2 days'
                        and (t.feedback_percepcao = 'dor' or t.checkin_pre = 'desconforto'))
       -- no máximo 3 por semana
       and (select count(*) from notificacoes_envios e where e.profile_id = r.profile_id and e.categoria = 'cardio'
             and e.status in ('enviada', 'enviando') and e.tentativa_em > now() - interval '7 days') < 3
       -- não empilha com outra notificação recente
       and not exists (select 1 from notificacoes_envios e where e.profile_id = r.profile_id
             and e.status in ('enviada', 'enviando') and e.tentativa_em > now() - interval '3 hours')
       and not public.em_silencio((now() at time zone r.fuso)::time,
             coalesce((select np.silencio_inicio from notificacao_preferencias np where np.profile_id = r.profile_id), '22:00'),
             coalesce((select np.silencio_fim from notificacao_preferencias np where np.profile_id = r.profile_id), '05:00'))
  )
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  select d.profile_id, 'cardio', 'cardio:' || d.aluno_id || ':' || d.hoje, now(), now() + interval '3 hours',
         jsonb_build_object(
           'nome', d.primeiro_nome,
           'modalidade', d.modalidade,
           'duracao_min', d.duracao_min,
           'falta_min', greatest(0, ceil(d.alvo_min - d.min_semana))::int,
           'falta_dias', greatest(0, d.alvo_dias - d.dias_semana)::int,
           'dias_restantes', d.dias_restantes)
    from devidos d
  on conflict (dedupe) do nothing;

  select array_agg(e.id) into ids
    from notificacoes_envios e
   where e.categoria = 'cardio' and e.status = 'pendente' and e.agendada_para <= now();
  if ids is null then return; end if;
  update notificacoes_envios e set status = 'enviando', tentativa_em = now() where e.id = any(ids) and e.status = 'pendente';
  return query
  select e.id, e.dados, d.endpoint, d.p256dh, d.auth
    from notificacoes_envios e join push_inscricoes d on d.profile_id = e.profile_id and d.ativo
   where e.id = any(ids) and e.status = 'enviando';
end $$;
revoke all on function public.cardio_notificacoes_devidas(text) from public, authenticated;
grant execute on function public.cardio_notificacoes_devidas(text) to anon;
