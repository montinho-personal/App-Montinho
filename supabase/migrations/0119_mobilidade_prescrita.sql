-- ============================================================================
-- 0119 — Mobilidade no protocolo (pedido do Montinho, 29/10/2026): quem contou
-- dor, lesão ou falta de mobilidade na anamnese já tem a mobilidade indicada;
-- o personal confirma, troca, escolhe os dias por semana ou desliga.
--   • mobilidade_prescricoes: só o personal grava; trocar = desativar a antiga
--     (`desativado_em`) e criar outra (como o cardio). Prescrição sem protocolo
--     e `ativo=false` = “desligado pelo personal” (vale por cima da anamnese).
--   • O aluno lê só a dele. Regras puras em src/lib/mobilidade/indicacao.ts.
-- ADIÇÃO e idempotente.
-- ============================================================================
create table if not exists mobilidade_prescricoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  protocolos text[] not null default '{}' check (protocolos <@ array['superiores','inferiores']::text[]),
  dias_semana smallint not null default 7 check (dias_semana between 1 and 7),
  motivo text check (motivo is null or char_length(motivo) <= 200),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  desativado_em timestamptz
);
create unique index if not exists mobilidade_prescricoes_vigente on mobilidade_prescricoes (aluno_id) where desativado_em is null;
alter table mobilidade_prescricoes enable row level security;

drop policy if exists mob_presc_treinador on mobilidade_prescricoes;
create policy mob_presc_treinador on mobilidade_prescricoes for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists mob_presc_aluno_le on mobilidade_prescricoes;
create policy mob_presc_aluno_le on mobilidade_prescricoes for select using (aluno_id = (select public.aluno_id_atual()));
revoke delete on mobilidade_prescricoes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lembrete diário da mobilidade no celular (mesmo caminho do cardio, 0101):
-- o banco decide quando e para quem; o cron (api/cron/lembretes) monta o texto
-- (src/lib/push/mobilidade.ts, que cita o troféu em jogo) e entrega.
--   • quem tem mobilidade indicada: prescrita pelo personal (ativa) OU, sem
--     prescrição, a anamnese fala de dor/lesão/falta de mobilidade (o mesmo
--     espelho das palavras de src/lib/mobilidade/indicacao.ts);
--   • 11h–13h59 no fuso da pessoa, fora do silêncio, aluno ativo (visitante
--     só com acesso em dia), sem treino em andamento;
--   • não manda se já fez hoje ou se bateu os dias da semana;
--   • 1 por dia; nada nas 3 h depois de outra notificação; respeita
--     “motivacionais” e a chave geral do Chalalá.
-- ---------------------------------------------------------------------------
alter table notificacoes_envios drop constraint if exists notificacoes_envios_categoria_check;
alter table notificacoes_envios add constraint notificacoes_envios_categoria_check check (categoria in ('bom_dia', 'pos_treino', 'teste', 'desafio', 'cardio', 'mobilidade'));

create or replace function public.mobilidade_indicada_protocolos(p_aluno uuid)
returns text[] language sql stable security definer set search_path = public as $$
  with p as (
    select protocolos, ativo from mobilidade_prescricoes where aluno_id = p_aluno and desativado_em is null
  ),
  t as (
    select lower(translate(concat_ws(' ', a.lesoes, a.dores_atuais, a.cirurgias, a.doencas_cronicas),
                 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) as txt
      from anamnese a where a.aluno_id = p_aluno
  )
  select case
    when exists (select 1 from p) then (select case when ativo then protocolos else '{}'::text[] end from p)
    else (
      select array_remove(array[
        case when t.txt ~ '(ombro|manguito|rotador|deltoide|subacromial|capsulite|pescoco|cervical|torcicolo|trapezio|toracic|dorsal|meio das costas|cifose|cotovelo|punho|epicondil|tunel do carpo)' then 'superiores' end,
        case when t.txt ~ '(lombar|coluna|hernia|disco|ciat|protrus|espondil|escoliose|dor nas costas|quadril|piriforme|femoroacetabular|adutor|joelho|patel|condromalacia|menisc|ligamento cruzado|tornozelo|entorse|fascite|calcanhar|aquiles|isquiotibia|posterior d[ae] coxa)' then 'inferiores' end
      ], null)
      || case when t.txt !~ '(ombro|manguito|rotador|deltoide|subacromial|capsulite|pescoco|cervical|torcicolo|trapezio|toracic|dorsal|meio das costas|cifose|cotovelo|punho|epicondil|tunel do carpo|lombar|coluna|hernia|disco|ciat|protrus|espondil|escoliose|dor nas costas|quadril|piriforme|femoroacetabular|adutor|joelho|patel|condromalacia|menisc|ligamento cruzado|tornozelo|entorse|fascite|calcanhar|aquiles|isquiotibia|posterior d[ae] coxa)'
                   and t.txt ~ '(mobilidade|flexibilidade|encurtad|encurtamento|rigidez|travad|pouca amplitude)' then array['superiores','inferiores'] else '{}'::text[] end
        from t
    )
  end;
$$;
revoke all on function public.mobilidade_indicada_protocolos(uuid) from public, anon, authenticated;

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
    select h.aluno_id,
           count(distinct (s.iniciado_em at time zone h.fuso)::date) filter (where (s.iniciado_em at time zone h.fuso)::date between h.seg and h.hoje) as dias_semana,
           bool_or((s.iniciado_em at time zone h.fuso)::date = h.hoje) as fez_hoje
      from hora h
      left join mobilidade_sessoes s on s.aluno_id = h.aluno_id and s.status = 'concluida' and s.protocolo = any(h.protocolos)
             and s.concluido_em >= s.iniciado_em + interval '10 minutes' and s.iniciado_em > now() - interval '8 days'
     group by h.aluno_id
  ),
  devidos as (
    select h.*, coalesce(f.dias_semana, 0) as dias_feitos,
           (select s.protocolo from mobilidade_sessoes s where s.aluno_id = h.aluno_id and s.status = 'concluida' and s.protocolo = any(h.protocolos) order by s.concluido_em desc limit 1) as ultimo
      from hora h left join feito f on f.aluno_id = h.aluno_id
     where extract(hour from h.agora_local) between 11 and 13
       and not coalesce(f.fez_hoje, false)
       and coalesce(f.dias_semana, 0) < h.dias_meta
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
           -- a indicada feita há mais tempo (com as duas, alterna)
           'protocolo', case when cardinality(d.protocolos) = 1 then d.protocolos[1] when d.ultimo = 'superiores' then 'inferiores' else 'superiores' end,
           'protocolos', to_jsonb(d.protocolos),
           'dias_feitos', d.dias_feitos,
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
