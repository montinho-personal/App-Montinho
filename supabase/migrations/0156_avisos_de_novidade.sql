-- ============================================================================
-- 0156 — Avisos de novidade para TODO mundo (pedido do Montinho, 11/11/2026:
-- “toda vez que a gente cria troféu e alunos ganham, manda uma notificação para
-- todo mundo dizendo que os números dos troféus mudaram porque foi criado troféu
-- novo, então quem já tinha acabou ganhando”).
-- Categoria 'novidade' em notificacoes_envios: mesma entrega da Academia da Tribo
-- (todo mundo com acesso e celular cadastrado, fora do silêncio, 1 por pessoa por
-- aviso pelo dedupe, vale 3 dias, com a chave geral). No app, aparece também no
-- 🔔 para quem não recebe no celular (central-notificacoes.ts).
-- avisar_novidade(): só o personal. O Claude, autorizado, insere pelo SQL.
-- ============================================================================

alter table notificacoes_envios drop constraint if exists notificacoes_envios_categoria_check;
alter table notificacoes_envios add constraint notificacoes_envios_categoria_check check (categoria in ('bom_dia', 'pos_treino', 'teste', 'desafio', 'cardio', 'mobilidade', 'feriado', 'obra', 'novidade'));

create or replace function public.avisar_novidade(p_chave text, p_titulo text, p_corpo text, p_url text default '/aluno/conquistas') returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_treinador() then raise exception 'não autorizado'; end if;
  if coalesce(btrim(p_chave), '') = '' or coalesce(btrim(p_titulo), '') = '' or coalesce(btrim(p_corpo), '') = '' then raise exception 'aviso incompleto'; end if;
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  select p.profile_id, 'novidade', left('novidade:' || p_chave || ':' || p.profile_id, 120), now(), now() + interval '3 days',
         jsonb_build_object('titulo', left(p_titulo, 80), 'corpo', left(p_corpo, 240), 'url', coalesce(nullif(p_url, ''), '/aluno/conquistas'))
    from public.obra_publico() p
  on conflict (dedupe) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.avisar_novidade(text, text, text, text) from public, anon;
grant execute on function public.avisar_novidade(text, text, text, text) to authenticated;

-- A entrega da obra passa a levar também as novidades (mesmas regras).
create or replace function public.obra_notificacoes_devidas(p_chave text)
returns table (envio_id uuid, titulo text, corpo text, url text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare
  cfg notificacao_config%rowtype;
  ids uuid[];
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  select * into cfg from notificacao_config where id = 1;
  update notificacoes_envios e set status = 'descartada', motivo = 'expirada' where e.categoria in ('obra', 'novidade') and e.status = 'pendente' and e.expira_em < now();
  if not coalesce(cfg.chalala_ativo, false) then return; end if;
  update notificacoes_envios e set status = 'descartada', motivo = 'sem_dispositivo'
   where e.categoria in ('obra', 'novidade') and e.status = 'pendente'
     and not exists (select 1 from push_inscricoes d where d.profile_id = e.profile_id and d.ativo);
  select array_agg(e.id) into ids
    from notificacoes_envios e
    left join notificacao_preferencias p on p.profile_id = e.profile_id
   where e.categoria in ('obra', 'novidade') and e.status = 'pendente' and e.agendada_para <= now()
     and not public.em_silencio((now() at time zone coalesce(p.fuso, 'America/Sao_Paulo'))::time, coalesce(p.silencio_inicio, '22:00'), coalesce(p.silencio_fim, '05:00'));
  if ids is null then return; end if;
  update notificacoes_envios e set status = 'enviando', tentativa_em = now() where e.id = any(ids) and e.status = 'pendente';
  return query
  select e.id, e.dados->>'titulo', e.dados->>'corpo', e.dados->>'url', d.endpoint, d.p256dh, d.auth
    from notificacoes_envios e join push_inscricoes d on d.profile_id = e.profile_id and d.ativo
   where e.id = any(ids) and e.status = 'enviando';
end $$;
revoke all on function public.obra_notificacoes_devidas(text) from public, authenticated;
grant execute on function public.obra_notificacoes_devidas(text) to anon;
