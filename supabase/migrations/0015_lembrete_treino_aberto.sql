-- ============================================================================
-- 0015 — Lembrete de treino em aberto (notificação push)
-- * push_inscricoes: aparelhos que aceitaram notificações (cada usuário vê só
--   os seus). Cadastro via push_registrar() para lidar com troca de conta no
--   mesmo aparelho.
-- * training_sessions.lembrete_enviado_em: no máximo 1 lembrete por treino.
-- * lembretes_devidos(chave): treinos em andamento sem atividade há N minutos,
--   com os aparelhos do aluno. Só responde com a chave do agendador (hash em
--   config_privada) e já marca o lembrete como enviado.
-- O agendamento (pg_cron + pg_net) fica fora do repositório porque leva a chave:
-- ver scripts/sql/agendar-lembretes.sql.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_push_inscricoes_profile on push_inscricoes(profile_id) where ativo;

alter table push_inscricoes enable row level security;
drop policy if exists push_inscricoes_proprias_select on push_inscricoes;
create policy push_inscricoes_proprias_select on push_inscricoes for select using (profile_id = auth.uid());
drop policy if exists push_inscricoes_proprias_delete on push_inscricoes;
create policy push_inscricoes_proprias_delete on push_inscricoes for delete using (profile_id = auth.uid());
-- Inserção/atualização só pela função abaixo (evita gravar em nome de outro).

alter table training_sessions add column if not exists lembrete_enviado_em timestamptz;

-- Configuração privada (sem acesso pela API: RLS ligada e nenhuma policy).
create table if not exists config_privada (
  chave text primary key,
  valor text not null
);
alter table config_privada enable row level security;
revoke all on config_privada from anon, authenticated;

-- Registra (ou move para a conta atual) a inscrição deste aparelho.
create or replace function public.push_registrar(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  if length(coalesce(p_endpoint, '')) < 20 or p_endpoint !~ '^https://' then raise exception 'endpoint inválido'; end if;
  insert into push_inscricoes (profile_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set profile_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, ativo = true, atualizado_em = now();
end $$;
revoke all on function public.push_registrar(text, text, text, text) from public, anon;
grant execute on function public.push_registrar(text, text, text, text) to authenticated;

create or replace function public.chave_agendador_ok(p_chave text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from config_privada
    where chave = 'lembrete_chave_sha256'
      and valor = encode(extensions.digest(coalesce(p_chave, ''), 'sha256'), 'hex')
  );
$$;
revoke all on function public.chave_agendador_ok(text) from public, anon, authenticated;

-- Lembretes a enviar agora (e marca como enviados: no máximo 1 por treino).
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

-- Desativa aparelhos que o serviço de push recusou (inscrição expirada).
create or replace function public.push_desativar(p_chave text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  update push_inscricoes set ativo = false, atualizado_em = now() where endpoint = p_endpoint;
end $$;
revoke all on function public.push_desativar(text, text) from public, authenticated;
grant execute on function public.push_desativar(text, text) to anon;
