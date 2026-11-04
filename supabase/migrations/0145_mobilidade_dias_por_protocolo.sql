-- ============================================================================
-- 0145 — Mobilidade no protocolo: dias por protocolo + observação
-- (pedido do Montinho, 04/11/2026: “2× inferiores e 2× superiores por semana;
-- a informação ficava vaga”).
--   • `dias_semana` passa a valer para CADA protocolo prescrito (2× = 2 dias de
--     superiores E 2 dias de inferiores). Regra espelhada em
--     src/lib/mobilidade/indicacao.ts (situacaoMobilidade).
--   • `observacao`: recado do personal para o aluno (até 500 letras).
--   • Lembrete no celular: manda enquanto ALGUM protocolo prescrito estiver
--     abaixo dos dias da semana, e sugere o que está mais atrasado.
-- ADIÇÃO e idempotente.
-- ============================================================================
alter table mobilidade_prescricoes add column if not exists observacao text;
alter table mobilidade_prescricoes drop constraint if exists mobilidade_prescricoes_observacao_check;
alter table mobilidade_prescricoes add constraint mobilidade_prescricoes_observacao_check check (observacao is null or char_length(observacao) <= 500);

create or replace function public.mobilidade_notificacoes_devidas(p_chave text)
returns table (envio_id uuid, dados jsonb, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare
  cfg notificacao_config%rowtype;
  ids uuid[];
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  select * into cfg from notificacao_config where id = 1;
  update notificacoes_envios e set status = 'descartada', motivo = 'expirada' where e.categoria = 'mobilidade' and e.status = 'pendente' and e.expira_em < now();
  if not coalesce(cfg.chalala_ativo, false) then return; end if;

  with base as (
    select a.id as aluno_id, a.profile_id, a.modalidade as tipo_aluno,
           coalesce(np.fuso, 'America/Sao_Paulo') as fuso,
           coalesce(np.motivacionais, true) as motivacionais,
           split_part(coalesce(nullif(btrim(p.nome), ''), ''), ' ', 1) as primeiro_nome,
           public.mobilidade_indicada_protocolos(a.id) as protocolos,
           coalesce((select mp.dias_semana from mobilidade_prescricoes mp where mp.aluno_id = a.id and mp.desativado_em is null and mp.ativo), 7) as dias_meta
      from alunos a
      join profiles p on p.id = a.profile_id
      left join notificacao_preferencias np on np.profile_id = a.profile_id
     where a.status = 'ativo'
       and exists (select 1 from push_inscricoes d where d.profile_id = a.profile_id and d.ativo)
  ),
  hora as (
    select b.*, (now() at time zone b.fuso) as agora_local, (now() at time zone b.fuso)::date as hoje,
           (date_trunc('week', (now() at time zone b.fuso)::date))::date as seg
      from base b
     where cardinality(b.protocolos) > 0 and b.motivacionais
  ),
  feito as (
    -- dias diferentes da semana com cada protocolo (cada um tem a sua meta)
    select h.aluno_id,
           count(distinct (s.iniciado_em at time zone h.fuso)::date) filter (where s.protocolo = 'superiores' and (s.iniciado_em at time zone h.fuso)::date between h.seg and h.hoje) as dias_sup,
           count(distinct (s.iniciado_em at time zone h.fuso)::date) filter (where s.protocolo = 'inferiores' and (s.iniciado_em at time zone h.fuso)::date between h.seg and h.hoje) as dias_inf,
           count(distinct (s.iniciado_em at time zone h.fuso)::date) filter (where (s.iniciado_em at time zone h.fuso)::date between h.seg and h.hoje) as dias_semana,
           bool_or((s.iniciado_em at time zone h.fuso)::date = h.hoje) as fez_hoje
      from hora h
      left join mobilidade_sessoes s on s.aluno_id = h.aluno_id and s.status = 'concluida' and s.protocolo = any(h.protocolos)
             and s.concluido_em >= s.iniciado_em + interval '10 minutes' and s.iniciado_em > now() - interval '8 days'
     group by h.aluno_id
  ),
  devidos as (
    select h.*, coalesce(f.dias_semana, 0) as dias_feitos, coalesce(f.dias_sup, 0) as dias_sup, coalesce(f.dias_inf, 0) as dias_inf,
           (select s.protocolo from mobilidade_sessoes s where s.aluno_id = h.aluno_id and s.status = 'concluida' and s.protocolo = any(h.protocolos) order by s.concluido_em desc limit 1) as ultimo
      from hora h left join feito f on f.aluno_id = h.aluno_id
     where extract(hour from h.agora_local) between 11 and 13
       and not coalesce(f.fez_hoje, false)
       and (('superiores' = any(h.protocolos) and coalesce(f.dias_sup, 0) < h.dias_meta)
         or ('inferiores' = any(h.protocolos) and coalesce(f.dias_inf, 0) < h.dias_meta))
       and (h.tipo_aluno <> 'visitante' or exists (select 1 from acessos_visitante v where v.aluno_id = h.aluno_id and (v.fim is null or v.fim > now())))
       and not exists (select 1 from training_sessions t where t.aluno_id = h.aluno_id and t.status = 'em_andamento')
       and not exists (select 1 from notificacoes_envios e where e.profile_id = h.profile_id
             and e.status in ('enviada', 'enviando') and e.tentativa_em > now() - interval '3 hours')
       and not public.em_silencio((now() at time zone h.fuso)::time,
             coalesce((select np.silencio_inicio from notificacao_preferencias np where np.profile_id = h.profile_id), '22:00'),
             coalesce((select np.silencio_fim from notificacao_preferencias np where np.profile_id = h.profile_id), '05:00'))
  )
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  select d.profile_id, 'mobilidade', 'mobilidade:' || d.aluno_id || ':' || d.hoje, now(), now() + interval '3 hours',
         jsonb_build_object(
           'nome', d.primeiro_nome,
           -- a que está mais atrasada na semana; empatadas, alterna com a última feita
           'protocolo', case when cardinality(d.protocolos) = 1 then d.protocolos[1]
                             when d.dias_sup < d.dias_inf then 'superiores' when d.dias_inf < d.dias_sup then 'inferiores'
                             when d.ultimo = 'superiores' then 'inferiores' else 'superiores' end,
           'protocolos', to_jsonb(d.protocolos),
           -- dias feitos do protocolo sugerido (a meta é por protocolo)
           'dias_feitos', case when cardinality(d.protocolos) = 1 then (case when d.protocolos[1] = 'superiores' then d.dias_sup else d.dias_inf end)
                               when d.dias_sup < d.dias_inf then d.dias_sup when d.dias_inf < d.dias_sup then d.dias_inf
                               when d.ultimo = 'superiores' then d.dias_inf else d.dias_sup end,
           'dias_meta', d.dias_meta,
           'trofeus', (select coalesce(jsonb_agg(c.codigo), '[]'::jsonb) from conquistas_aluno c where c.aluno_id = d.aluno_id and c.codigo like 'mobilidade%'))
    from devidos d
  on conflict (dedupe) do nothing;

  select array_agg(e.id) into ids
    from notificacoes_envios e
   where e.categoria = 'mobilidade' and e.status = 'pendente' and e.agendada_para <= now();
  if ids is null then return; end if;
  update notificacoes_envios e set status = 'enviando', tentativa_em = now() where e.id = any(ids) and e.status = 'pendente';
  return query
  select e.id, e.dados, d.endpoint, d.p256dh, d.auth
    from notificacoes_envios e join push_inscricoes d on d.profile_id = e.profile_id and d.ativo
   where e.id = any(ids) and e.status = 'enviando';
end $$;
revoke all on function public.mobilidade_notificacoes_devidas(text) from public, authenticated;
grant execute on function public.mobilidade_notificacoes_devidas(text) to anon;

