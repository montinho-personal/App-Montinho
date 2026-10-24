-- ============================================================================
-- 0095 — Notificações no celular dos desafios (liberadas pelo Montinho em
-- 24/10/2026), no mesmo caminho do Chalalá (0036): o banco decide quando e
-- para quem; o cron (api/cron/lembretes) só entrega. Depende de 0094.
-- • convite recebido, cutucada e “o desafio termina amanhã”;
-- • no máximo 1 notificação de desafio por pessoa a cada 24 h, fora do
--   horário de silêncio, respeitando “motivacionais” e a chave geral.
-- ============================================================================
alter table notificacoes_envios drop constraint if exists notificacoes_envios_categoria_check;
alter table notificacoes_envios add constraint notificacoes_envios_categoria_check check (categoria in ('bom_dia', 'pos_treino', 'teste', 'desafio'));
alter table notificacoes_envios add column if not exists dados jsonb;

-- Enfileira uma notificação de desafio para um aluno (se ele tiver login).
create or replace function public.desafio_enfileirar(p_aluno uuid, p_dedupe text, p_titulo text, p_corpo text, p_url text, p_validade interval)
returns void language sql security definer set search_path = public as $$
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  select a.profile_id, 'desafio', left(p_dedupe, 120), now(), now() + p_validade,
         jsonb_build_object('titulo', left(p_titulo, 120), 'corpo', left(p_corpo, 300), 'url', left(p_url, 200))
    from alunos a where a.id = p_aluno and a.profile_id is not null
  on conflict (dedupe) do nothing;
$$;
revoke all on function public.desafio_enfileirar(uuid, text, text, text, text, interval) from public, anon, authenticated;

create or replace function public.desafio_notifica_convite()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text; v_de text;
begin
  if new.status <> 'convidado' then return new; end if;
  select d.nome into v_nome from desafios d where d.id = new.desafio_id;
  select public.nome_curto(p.nome) into v_de from alunos a left join profiles p on p.id = a.profile_id where a.id = new.convidado_por;
  perform public.desafio_enfileirar(new.aluno_id, 'desafio_convite:' || new.desafio_id || ':' || new.aluno_id,
    '⚔️ Você foi desafiado!', coalesce(v_de, 'Alguém') || ' te chamou para “' || v_nome || '”. Topa?', '/aluno/desafios/' || new.desafio_id, interval '3 days');
  return new;
end $$;
revoke all on function public.desafio_notifica_convite() from public, anon, authenticated;
drop trigger if exists trg_desafio_notifica_convite on desafio_participantes;
create trigger trg_desafio_notifica_convite after insert on desafio_participantes for each row execute function public.desafio_notifica_convite();

create or replace function public.desafio_notifica_cutucada()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text; v_de text;
begin
  select d.nome into v_nome from desafios d where d.id = new.desafio_id;
  select public.nome_curto(p.nome) into v_de from alunos a left join profiles p on p.id = a.profile_id where a.id = new.de_aluno_id;
  perform public.desafio_enfileirar(new.para_aluno_id, 'desafio_cutucada:' || new.id,
    new.emoji || ' ' || coalesce(v_de, 'Alguém') || ' te cutucou!', 'No desafio “' || v_nome || '”. Bora responder no treino!', '/aluno/desafios/' || new.desafio_id, interval '12 hours');
  return new;
end $$;
revoke all on function public.desafio_notifica_cutucada() from public, anon, authenticated;
drop trigger if exists trg_desafio_notifica_cutucada on desafio_cutucadas;
create trigger trg_desafio_notifica_cutucada after insert on desafio_cutucadas for each row execute function public.desafio_notifica_cutucada();

-- Chamado pelo cron com a chave do agendador: cria os “termina amanhã” e
-- devolve o que está pronto para enviar (1 por pessoa a cada 24 h).
create or replace function public.desafio_notificacoes_devidas(p_chave text)
returns table (envio_id uuid, titulo text, corpo text, url text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare
  cfg notificacao_config%rowtype;
  ids uuid[];
  v_amanha date := (now() at time zone 'America/Sao_Paulo')::date + 1;
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  select * into cfg from notificacao_config where id = 1;
  update notificacoes_envios e set status = 'descartada', motivo = 'expirada' where e.categoria = 'desafio' and e.status = 'pendente' and e.expira_em < now();
  if not coalesce(cfg.chalala_ativo, false) then return; end if;

  -- Termina amanhã (para quem aceitou), a partir das 9h de Brasília.
  if extract(hour from now() at time zone 'America/Sao_Paulo') >= 9 then
    perform public.desafio_enfileirar(dp.aluno_id, 'desafio_fim:' || d.id || ':' || dp.aluno_id,
      '⏳ Falta 1 dia!', '“' || d.nome || '” termina amanhã. Confira o placar e garanta seu treino.', '/aluno/desafios/' || d.id, interval '14 hours')
      from desafios d join desafio_participantes dp on dp.desafio_id = d.id and dp.status = 'aceito'
     where d.cancelado_em is null and d.fim = v_amanha and d.inicio < v_amanha;
  end if;

  update notificacoes_envios e set status = 'descartada', motivo = 'preferencia'
    from notificacao_preferencias p
   where e.categoria = 'desafio' and e.status = 'pendente' and p.profile_id = e.profile_id and not p.motivacionais;
  update notificacoes_envios e set status = 'descartada', motivo = 'sem_dispositivo'
   where e.categoria = 'desafio' and e.status = 'pendente'
     and not exists (select 1 from push_inscricoes d where d.profile_id = e.profile_id and d.ativo);

  select array_agg(c.id) into ids from (
    select distinct on (e.profile_id) e.id
      from notificacoes_envios e
      left join notificacao_preferencias p on p.profile_id = e.profile_id
     where e.categoria = 'desafio' and e.status = 'pendente' and e.agendada_para <= now()
       and not public.em_silencio((now() at time zone coalesce(p.fuso, 'America/Sao_Paulo'))::time, coalesce(p.silencio_inicio, '22:00'), coalesce(p.silencio_fim, '05:00'))
       and not exists (select 1 from notificacoes_envios x where x.profile_id = e.profile_id and x.categoria = 'desafio' and x.status in ('enviada', 'enviando') and x.tentativa_em > now() - interval '24 hours')
     order by e.profile_id, e.criado_em
  ) c;
  if ids is null then return; end if;
  update notificacoes_envios e set status = 'enviando', tentativa_em = now() where e.id = any(ids) and e.status = 'pendente';
  return query
  select e.id, e.dados->>'titulo', e.dados->>'corpo', e.dados->>'url', d.endpoint, d.p256dh, d.auth
    from notificacoes_envios e join push_inscricoes d on d.profile_id = e.profile_id and d.ativo
   where e.id = any(ids) and e.status = 'enviando';
end $$;
revoke all on function public.desafio_notificacoes_devidas(text) from public, authenticated;
grant execute on function public.desafio_notificacoes_devidas(text) to anon;
