-- ============================================================================
-- 0147 — Academia da Tribo: canal PRÓPRIO dos avisos (pedido do Montinho, 05/11/2026:
-- “essa novidade precisa ser enviada por notificação pro pessoal”).
-- Antes, lançamento e inauguração iam pelo canal dos desafios, que entrega só 1 por
-- pessoa a cada 24 h e descarta quem desligou os recados motivacionais. Agora vão na
-- categoria 'obra': para todo mundo com o celular cadastrado, fora do horário de
-- silêncio, uma vez só por pessoa (dedupe), válido por 3 dias, com a chave geral.
-- ============================================================================

alter table notificacoes_envios drop constraint if exists notificacoes_envios_categoria_check;
alter table notificacoes_envios add constraint notificacoes_envios_categoria_check check (categoria in ('bom_dia', 'pos_treino', 'teste', 'desafio', 'cardio', 'mobilidade', 'feriado', 'obra'));

create or replace function public.obra_ativar(p_obra uuid, p_confirmacao text) returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  o obras%rowtype;
  v_agora timestamptz := now();
begin
  if not public.is_treinador() then raise exception 'não autorizado'; end if;
  if upper(btrim(coalesce(p_confirmacao, ''))) <> 'ATIVAR' then raise exception 'Digite ATIVAR para confirmar.'; end if;
  select * into o from obras where id = p_obra for update;
  if not found then raise exception 'Obra não encontrada.'; end if;
  if o.estado <> 'rascunho' then raise exception 'Essa obra já foi ativada.'; end if;
  if exists (select 1 from obras where estado = 'ativa') then raise exception 'Já existe uma obra em andamento.'; end if;
  perform set_config('montinho.obra', 'on', true);
  update obras set estado = 'ativa', ativada_em = v_agora, ativada_por = auth.uid(),
         config_ativacao = jsonb_build_object('nome', o.nome, 'modelo', o.modelo, 'area_m2', o.area_m2, 'materiais_t', o.materiais_t,
                                              'meta_kg', o.meta_kg, 'banner_dias', o.banner_dias, 'narrativa', o.narrativa, 'ativada_em', v_agora)
   where id = p_obra;
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  select p.profile_id, 'obra', left('obra:' || p_obra || ':lancamento:' || p.profile_id, 120), now(), now() + interval '3 days',
         jsonb_build_object('titulo', '🏗️ A TRIBO VAI CONSTRUIR UMA ACADEMIA!',
                            'corpo', 'Nossa ' || case when o.ordem = 1 then 'primeira obra' else o.ordem || 'ª obra' end || ' começou! Cada tonelada movimentada na musculação vai ajudar a construir a ' || o.nome || '. Venha fazer parte dessa história!',
                            'url', '/aluno/academia')
    from public.obra_publico() p
  on conflict (dedupe) do nothing;
  return v_agora;
end $$;
revoke all on function public.obra_ativar(uuid, text) from public, anon;
grant execute on function public.obra_ativar(uuid, text) to authenticated;

create or replace function public.obra_concluir_interno(p_obra uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  o obras%rowtype;
  v_total numeric;
  v_pessoas integer;
  v_treinos integer;
begin
  select * into o from obras where id = p_obra;
  if o.estado <> 'ativa' then return; end if;
  v_total := public.obra_total_kg(p_obra);
  if v_total < o.meta_kg then return; end if;
  perform set_config('montinho.obra', 'on', true);
  insert into obra_participantes (obra_id, aluno_id, kg, treinos, primeiro_em)
  select c.obra_id, c.aluno_id, sum(c.kg), count(*) filter (where c.kg > 0), min(c.treino_em)
    from obra_contribuicoes c where c.obra_id = p_obra and c.kg > 0
   group by c.obra_id, c.aluno_id
  on conflict do nothing;
  select count(*), coalesce(sum(treinos), 0) into v_pessoas, v_treinos from obra_participantes where obra_id = p_obra;
  update obras set estado = 'concluida', concluida_em = now(), total_kg_final = v_total, participantes_final = v_pessoas, treinos_final = v_treinos
   where id = p_obra;
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  select p.profile_id, 'obra', left('obra:' || p_obra || ':inauguracao:' || p.profile_id, 120), now(), now() + interval '3 days',
         jsonb_build_object('titulo', '🎉 INAUGURAMOS NOSSA ACADEMIA!',
                            'corpo', 'A tribo conseguiu! A ' || o.nome || ' está oficialmente concluída. Foram ' ||
                                     replace(to_char(round(v_total / 1000), 'FM999,999,999'), ',', '.') || ' toneladas movimentadas por ' || v_pessoas ||
                                     case when v_pessoas = 1 then ' participante' else ' participantes' end || '. Venha conhecer a obra que construímos juntos!',
                            'url', '/aluno/academia/' || p_obra)
    from public.obra_publico() p
  on conflict (dedupe) do nothing;
end $$;
revoke all on function public.obra_concluir_interno(uuid) from public, anon, authenticated;

-- Entrega dos avisos da obra (cron api/cron/lembretes, a cada 5 min).
create or replace function public.obra_notificacoes_devidas(p_chave text)
returns table (envio_id uuid, titulo text, corpo text, url text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare
  cfg notificacao_config%rowtype;
  ids uuid[];
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  select * into cfg from notificacao_config where id = 1;
  update notificacoes_envios e set status = 'descartada', motivo = 'expirada' where e.categoria = 'obra' and e.status = 'pendente' and e.expira_em < now();
  if not coalesce(cfg.chalala_ativo, false) then return; end if;
  update notificacoes_envios e set status = 'descartada', motivo = 'sem_dispositivo'
   where e.categoria = 'obra' and e.status = 'pendente'
     and not exists (select 1 from push_inscricoes d where d.profile_id = e.profile_id and d.ativo);
  select array_agg(e.id) into ids
    from notificacoes_envios e
    left join notificacao_preferencias p on p.profile_id = e.profile_id
   where e.categoria = 'obra' and e.status = 'pendente' and e.agendada_para <= now()
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
