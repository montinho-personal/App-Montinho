-- ============================================================================
-- 0036 — Ecossistema Chalalá: notificações no celular (Web Push existente)
-- ----------------------------------------------------------------------------
-- Reaproveita a infraestrutura da 0015 (push_inscricoes, VAPID, pg_cron a cada
-- 5 min chamando /api/cron/lembretes com a chave do agendador). Nada aqui usa a
-- chave de serviço: o servidor só fala com o banco por funções protegidas pela
-- chave do agendador (envios) ou pelo login do próprio usuário (testes).
--
-- * notificacao_preferencias: o que cada pessoa quer receber (Bom Dia é opt-in;
--   horário, silêncio e fuso configuráveis).
-- * notificacao_config: chave geral (começa DESLIGADA) e limites globais.
-- * notificacoes_envios: fila + histórico. `dedupe` único impede duplicar
--   (um Bom Dia por dia local, um pós-treino por treino). O texto é gravado
--   quando sai (o app mostra o histórico completo).
-- * Gatilho: treino concluído agenda o pós-treino para 90 min depois.
-- * eventos_chalala: novos eventos de produto + `ref` (exercício) sem texto livre.
-- Migração aditiva e idempotente.
-- ============================================================================

-- 1) Preferências ------------------------------------------------------------
create table if not exists notificacao_preferencias (
  profile_id uuid primary key references profiles(id) on delete cascade,
  motivacionais boolean not null default true,
  bom_dia boolean not null default false,
  bom_dia_hora time not null default '07:00' check (bom_dia_hora between '05:00' and '11:00'),
  pos_treino boolean not null default true,
  lembrete_treino boolean not null default true,
  silencio_inicio time not null default '22:00',
  silencio_fim time not null default '05:00',
  fuso text not null default 'America/Sao_Paulo' check (fuso in (
    'America/Sao_Paulo','America/Bahia','America/Fortaleza','America/Recife','America/Belem','America/Maceio','America/Araguaina',
    'America/Manaus','America/Cuiaba','America/Campo_Grande','America/Porto_Velho','America/Boa_Vista','America/Rio_Branco',
    'America/Noronha','Europe/Lisbon')),
  atualizado_em timestamptz not null default now()
);
alter table notificacao_preferencias enable row level security;
drop policy if exists notif_pref_propria on notificacao_preferencias;
create policy notif_pref_propria on notificacao_preferencias for all
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
drop policy if exists notif_pref_treinador_le on notificacao_preferencias;
create policy notif_pref_treinador_le on notificacao_preferencias for select using (public.is_treinador());

-- 2) Configuração geral (uma linha) ------------------------------------------
create table if not exists notificacao_config (
  id smallint primary key default 1 check (id = 1),
  chalala_ativo boolean not null default false,
  limite_diario smallint not null default 2 check (limite_diario between 1 and 6),
  intervalo_minimo_min smallint not null default 60 check (intervalo_minimo_min between 0 and 240),
  atualizado_em timestamptz not null default now()
);
insert into notificacao_config (id) values (1) on conflict (id) do nothing;
alter table notificacao_config enable row level security;
drop policy if exists notif_config_le on notificacao_config;
create policy notif_config_le on notificacao_config for select using ((select auth.uid()) is not null);
drop policy if exists notif_config_treinador on notificacao_config;
create policy notif_config_treinador on notificacao_config for update using (public.is_treinador()) with check (public.is_treinador());

-- 3) Fila + histórico ---------------------------------------------------------
create table if not exists notificacoes_envios (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  categoria text not null check (categoria in ('bom_dia','pos_treino','teste')),
  dedupe text not null unique check (length(dedupe) <= 120),
  mensagem smallint,
  variante text check (variante is null or length(variante) <= 20),
  session_id uuid references training_sessions(id) on delete set null,
  agendada_para timestamptz not null,
  expira_em timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente','enviando','enviada','falhou','descartada')),
  motivo text check (motivo is null or length(motivo) <= 40),
  titulo text check (titulo is null or length(titulo) <= 120),
  corpo text check (corpo is null or length(corpo) <= 600),
  url text check (url is null or length(url) <= 200),
  dispositivos_ok smallint not null default 0,
  dispositivos_falha smallint not null default 0,
  tentativa_em timestamptz,
  enviada_em timestamptz,
  aberta_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists idx_envios_pendentes on notificacoes_envios(agendada_para) where status = 'pendente';
create index if not exists idx_envios_profile on notificacoes_envios(profile_id, criado_em desc);
alter table notificacoes_envios enable row level security;
drop policy if exists envios_proprios_le on notificacoes_envios;
create policy envios_proprios_le on notificacoes_envios for select using (profile_id = (select auth.uid()) or public.is_treinador());
-- Sem insert/update/delete pela API: só pelas funções abaixo.

-- Silêncio: [início, fim) — atravessa a meia-noite quando início > fim.
create or replace function public.em_silencio(t time, ini time, fim time)
returns boolean language sql immutable as $$
  select case when ini = fim then false when ini < fim then t >= ini and t < fim else t >= ini or t < fim end;
$$;

-- Bom Dia devido neste momento local? Dias úteis, do horário escolhido até 45 min
-- depois (tolerância do agendador), fora do silêncio.
create or replace function public.bom_dia_devido(agora_local timestamp, hora time, ini time, fim time)
returns boolean language sql immutable as $$
  select extract(isodow from agora_local) between 1 and 5
     and agora_local::time >= hora
     and agora_local::time < hora + interval '45 minutes'
     and not public.em_silencio(agora_local::time, ini, fim);
$$;

-- 4) Pós-treino: agendado pelo banco ao concluir -------------------------------
create or replace function public.agendar_pos_treino()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluida' and new.finalizado_em is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'concluida')
     and new.finalizado_em > now() - interval '3 hours' then
    insert into notificacoes_envios (profile_id, categoria, dedupe, session_id, agendada_para, expira_em)
    select a.profile_id, 'pos_treino', 'pos_treino:' || new.id, new.id,
           new.finalizado_em + interval '90 minutes', new.finalizado_em + interval '4 hours'
    from alunos a
    where a.id = new.aluno_id and a.profile_id is not null
      and exists (select 1 from push_inscricoes p where p.profile_id = a.profile_id and p.ativo)
    on conflict (dedupe) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists trg_agendar_pos_treino on training_sessions;
create trigger trg_agendar_pos_treino after insert or update of status on training_sessions
  for each row execute function public.agendar_pos_treino();

-- 5) Agendador: cria o Bom Dia do momento e devolve o que sai agora ------------
create or replace function public.chalala_notificacoes_devidas(p_chave text)
returns table (envio_id uuid, categoria text, mensagem smallint, session_id uuid, endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg notificacao_config%rowtype;
  ids uuid[];
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  select * into cfg from notificacao_config where id = 1;

  -- Nada de notificação velha acumulada.
  update notificacoes_envios e set status = 'descartada', motivo = 'expirada'
  where e.status = 'pendente' and e.expira_em < now();

  if not coalesce(cfg.chalala_ativo, false) then return; end if;

  -- Bom Dia: dias úteis, a partir do horário escolhido (janela de 45 min), 1 por dia local.
  insert into notificacoes_envios (profile_id, categoria, dedupe, mensagem, agendada_para, expira_em)
  select p.profile_id, 'bom_dia',
         'bom_dia:' || p.profile_id || ':' || to_char(now() at time zone p.fuso, 'YYYY-MM-DD'),
         (coalesce((select x.mensagem from notificacoes_envios x where x.profile_id = p.profile_id and x.categoria = 'bom_dia' order by x.criado_em desc limit 1), 0) % 5 + 1)::smallint,
         now(), now() + interval '45 minutes'
  from notificacao_preferencias p
  where p.bom_dia and p.motivacionais
    and public.bom_dia_devido(now() at time zone p.fuso, p.bom_dia_hora, p.silencio_inicio, p.silencio_fim)
    and exists (select 1 from push_inscricoes d where d.profile_id = p.profile_id and d.ativo)
  on conflict (dedupe) do nothing;

  -- Descartes definitivos (com motivo, para o painel).
  update notificacoes_envios e set status = 'descartada', motivo = 'preferencia'
  from notificacao_preferencias p
  where e.status = 'pendente' and e.agendada_para <= now() and p.profile_id = e.profile_id
    and (not p.motivacionais or (e.categoria = 'bom_dia' and not p.bom_dia) or (e.categoria = 'pos_treino' and not p.pos_treino));
  update notificacoes_envios e set status = 'descartada', motivo = 'treino_revertido'
  where e.status = 'pendente' and e.categoria = 'pos_treino' and e.agendada_para <= now()
    and (e.session_id is null or not exists (select 1 from training_sessions s where s.id = e.session_id and s.status = 'concluida'));
  update notificacoes_envios e set status = 'descartada', motivo = 'limite_pos_treino'
  where e.status = 'pendente' and e.categoria = 'pos_treino' and e.agendada_para <= now()
    and (exists (select 1 from notificacoes_envios x where x.profile_id = e.profile_id and x.categoria = 'pos_treino' and x.status in ('enviada','enviando') and x.tentativa_em > now() - interval '48 hours')
      or (select count(*) from notificacoes_envios x where x.profile_id = e.profile_id and x.categoria = 'pos_treino' and x.status in ('enviada','enviando') and x.tentativa_em > now() - interval '7 days') >= 2);
  update notificacoes_envios e set status = 'descartada', motivo = 'sem_dispositivo'
  where e.status = 'pendente' and e.agendada_para <= now()
    and not exists (select 1 from push_inscricoes d where d.profile_id = e.profile_id and d.ativo);

  -- Prontas: fora do silêncio, respeitando espaçamento e limite diário; uma por pessoa por rodada.
  select array_agg(c.id) into ids from (
    select distinct on (z.profile_id) z.id from (
      select e.id, e.profile_id, e.categoria, e.agendada_para
      from notificacoes_envios e
      left join notificacao_preferencias p on p.profile_id = e.profile_id
      where e.status = 'pendente' and e.agendada_para <= now() and e.categoria in ('bom_dia','pos_treino')
        and not public.em_silencio((now() at time zone coalesce(p.fuso, 'America/Sao_Paulo'))::time, coalesce(p.silencio_inicio, '22:00'), coalesce(p.silencio_fim, '05:00'))
        and not exists (select 1 from notificacoes_envios x where x.profile_id = e.profile_id and x.categoria <> 'teste' and x.status in ('enviada','enviando') and x.tentativa_em > now() - make_interval(mins => cfg.intervalo_minimo_min))
        and (select count(*) from notificacoes_envios x where x.profile_id = e.profile_id and x.categoria <> 'teste' and x.status in ('enviada','enviando') and x.tentativa_em > now() - interval '24 hours') < cfg.limite_diario
      for update of e skip locked
    ) z
    order by z.profile_id, (z.categoria = 'pos_treino') desc, z.agendada_para
  ) c;
  if ids is null then return; end if;

  update notificacoes_envios e set status = 'enviando', tentativa_em = now() where e.id = any(ids) and e.status = 'pendente';
  return query
  select e.id, e.categoria, e.mensagem, e.session_id, d.endpoint, d.p256dh, d.auth
  from notificacoes_envios e
  join push_inscricoes d on d.profile_id = e.profile_id and d.ativo
  where e.id = any(ids) and e.status = 'enviando';
end $$;
revoke all on function public.chalala_notificacoes_devidas(text) from public, authenticated;
grant execute on function public.chalala_notificacoes_devidas(text) to anon;

create or replace function public.chalala_notificacao_resultado(p_chave text, p_id uuid, p_titulo text, p_corpo text, p_url text, p_ok integer, p_falha integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  update notificacoes_envios
     set status = case when p_ok > 0 then 'enviada' else 'falhou' end,
         enviada_em = case when p_ok > 0 then now() end,
         titulo = left(p_titulo, 120), corpo = left(p_corpo, 600), url = left(p_url, 200),
         dispositivos_ok = least(greatest(p_ok, 0), 50), dispositivos_falha = least(greatest(p_falha, 0), 50)
   where id = p_id and status = 'enviando';
end $$;
revoke all on function public.chalala_notificacao_resultado(text, uuid, text, text, text, integer, integer) from public, authenticated;
grant execute on function public.chalala_notificacao_resultado(text, uuid, text, text, text, integer, integer) to anon;

-- 6) Teste de envio para o PRÓPRIO aparelho (aluno ou treinador) ---------------
create or replace function public.notificacao_teste_criar()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare novo uuid;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  if exists (select 1 from notificacoes_envios where profile_id = auth.uid() and categoria = 'teste' and criado_em > now() - interval '1 minute')
     or (select count(*) from notificacoes_envios where profile_id = auth.uid() and categoria = 'teste' and criado_em > now() - interval '1 day') >= 10 then
    raise exception 'limite de testes' using errcode = 'P0001';
  end if;
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, status, tentativa_em)
  values (auth.uid(), 'teste', 'teste:' || gen_random_uuid(), now(), now() + interval '5 minutes', 'enviando', now())
  returning id into novo;
  return novo;
end $$;
revoke all on function public.notificacao_teste_criar() from public, anon;
grant execute on function public.notificacao_teste_criar() to authenticated;

create or replace function public.notificacao_teste_resultado(p_id uuid, p_titulo text, p_corpo text, p_url text, p_ok integer, p_falha integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update notificacoes_envios
     set status = case when p_ok > 0 then 'enviada' else 'falhou' end,
         enviada_em = case when p_ok > 0 then now() end,
         titulo = left(p_titulo, 120), corpo = left(p_corpo, 600), url = left(p_url, 200),
         dispositivos_ok = least(greatest(p_ok, 0), 50), dispositivos_falha = least(greatest(p_falha, 0), 50)
   where id = p_id and profile_id = auth.uid() and categoria = 'teste' and status = 'enviando';
end $$;
revoke all on function public.notificacao_teste_resultado(uuid, text, text, text, integer, integer) from public, anon;
grant execute on function public.notificacao_teste_resultado(uuid, text, text, text, integer, integer) to authenticated;

-- Abertura (toque na notificação): só a própria.
create or replace function public.notificacao_aberta(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update notificacoes_envios set aberta_em = now() where id = p_id and profile_id = auth.uid() and aberta_em is null;
$$;
revoke all on function public.notificacao_aberta(uuid) from public, anon;
grant execute on function public.notificacao_aberta(uuid) to authenticated;

-- 7) Lembrete de treino em aberto passa a respeitar a preferência -------------
create or replace function public.lembretes_devidos(p_chave text, p_minutos integer default 30)
returns table (sessao_id uuid, treino_id uuid, nome_treino text, series_feitas integer, series_planejadas integer, endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  return query
  with abertas as (
    select s.id, s.treino_id, s.nome_treino, s.series_planejadas, a.profile_id,
           greatest(s.iniciado_em, coalesce((select max(x.concluida_em) from session_sets x where x.session_id = s.id), s.iniciado_em)) as ultima_atividade,
           (select count(*)::int from session_sets x where x.session_id = s.id and x.tipo <> 'aquecimento') as feitas
    from training_sessions s
    join alunos a on a.id = s.aluno_id
    where s.status = 'em_andamento'
      and s.lembrete_enviado_em is null
      and s.iniciado_em > now() - interval '12 hours'
      and a.profile_id is not null
      and coalesce((select np.lembrete_treino from notificacao_preferencias np where np.profile_id = a.profile_id), true)
  ),
  devidas as (
    select * from abertas
    where ultima_atividade < now() - make_interval(mins => greatest(5, p_minutos))
      and exists (select 1 from push_inscricoes p where p.profile_id = abertas.profile_id and p.ativo)
  ),
  marcadas as (
    update training_sessions t set lembrete_enviado_em = now()
    from devidas d where t.id = d.id
    returning t.id
  )
  select d.id, d.treino_id, d.nome_treino, d.feitas, d.series_planejadas, p.endpoint, p.p256dh, p.auth
  from devidas d
  join marcadas m on m.id = d.id
  join push_inscricoes p on p.profile_id = d.profile_id and p.ativo;
end $$;
revoke all on function public.lembretes_devidos(text, integer) from public, authenticated;
grant execute on function public.lembretes_devidos(text, integer) to anon;

-- 8) Métricas agregadas para o painel do treinador ----------------------------
create or replace function public.chalala_metricas_push(p_desde timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare r jsonb;
begin
  if not public.is_treinador() then raise exception 'apenas o treinador'; end if;
  with alunos_push as (
    select distinct d.profile_id from push_inscricoes d join profiles pr on pr.id = d.profile_id and pr.role = 'aluno' where d.ativo
  ),
  env as (select * from notificacoes_envios where criado_em >= p_desde and categoria <> 'teste')
  select jsonb_build_object(
    'inscritos', (select count(*) from alunos_push),
    'habilitados', (select count(*) from alunos_push a left join notificacao_preferencias p on p.profile_id = a.profile_id where coalesce(p.motivacionais, true)),
    'bomDiaLigado', (select count(*) from alunos_push a join notificacao_preferencias p on p.profile_id = a.profile_id where p.bom_dia and p.motivacionais),
    'posTreinoLigado', (select count(*) from alunos_push a left join notificacao_preferencias p on p.profile_id = a.profile_id where coalesce(p.motivacionais, true) and coalesce(p.pos_treino, true)),
    'enviadas', (select count(*) from env where status = 'enviada'),
    'falhas', (select count(*) from env where status = 'falhou') + coalesce((select sum(dispositivos_falha) from env where status = 'enviada'), 0),
    'abertas', (select count(*) from env where aberta_em is not null),
    'bomDiaEnviadas', (select count(*) from env where categoria = 'bom_dia' and status = 'enviada'),
    'bomDiaAbertas', (select count(*) from env where categoria = 'bom_dia' and aberta_em is not null),
    'posTreinoEnviadas', (select count(*) from env where categoria = 'pos_treino' and status = 'enviada'),
    'descartadas', (select coalesce(jsonb_object_agg(motivo, n), '{}'::jsonb) from (select coalesce(motivo, 'outro') motivo, count(*) n from env where status = 'descartada' group by 1) m),
    'treinosAposAbertura', (select count(distinct s.id) from env e join alunos a on a.profile_id = e.profile_id join training_sessions s on s.aluno_id = a.id
                            where e.aberta_em is not null and s.iniciado_em between e.aberta_em and e.aberta_em + interval '3 hours'),
    'ativo', (select chalala_ativo from notificacao_config where id = 1),
    'limiteDiario', (select limite_diario from notificacao_config where id = 1),
    'intervaloMin', (select intervalo_minimo_min from notificacao_config where id = 1)
  ) into r;
  return r;
end $$;
revoke all on function public.chalala_metricas_push(timestamptz) from public, anon;
grant execute on function public.chalala_metricas_push(timestamptz) to authenticated;

-- 9) Eventos de produto do Chalalá (sem texto livre) ---------------------------
alter table eventos_chalala add column if not exists ref text check (ref is null or ref ~ '^[A-Za-z0-9_:-]{1,80}$');
create index if not exists idx_eventos_chalala_aluno_ref on eventos_chalala(aluno_id, tipo, created_at desc) where ref is not null;
alter table eventos_chalala drop constraint if exists eventos_chalala_tipo_check;
alter table eventos_chalala add constraint eventos_chalala_tipo_check check (tipo in (
  'conclusao_vista','editor_aberto','modelo_escolhido','card_gerado','download','compartilhar_nativo','compartilhar_cancelado','visita_link',
  'vitrine_vista','explicacao_aberta','colecao_vista',
  'conhecimento_aberto','quiz_respondido','sugestao_vista','sugestao_aberta','descoberta_salva','descoberta_compartilhada',
  'chalala_workout_started','chalala_progression_shown','chalala_reps_evolution_shown','chalala_record_unlocked',
  'chalala_advanced_technique_shown','chalala_workout_completed','chalala_push_permission_granted','chalala_push_permission_revoked'
));
-- O aluno lê SÓ os próprios eventos de incentivo de progressão (para não repetir o incentivo em 14 dias).
drop policy if exists eventos_chalala_aluno_le on eventos_chalala;
create policy eventos_chalala_aluno_le on eventos_chalala for select using (tipo = 'chalala_progression_shown' and aluno_id is not null and aluno_id = public.aluno_id_atual());
