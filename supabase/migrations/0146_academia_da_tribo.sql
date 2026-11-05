-- ============================================================================
-- 0146 — Academia da Tribo (pedido do Montinho, 05/11/2026)
-- A tribo constrói academias com as toneladas REAIS movimentadas na musculação.
-- ADIÇÃO: nada do que existe muda (Tribo, troféus, ranking, notificações).
--
-- Regras (espelho testado em src/lib/academia/regras.ts):
--  • A obra nasce RASCUNHO com 0 kg. Só o personal ativa, com ação explícita
--    (obra_ativar + palavra de confirmação). Nunca ativa em migration/deploy.
--  • Só contam treinos COMEÇADOS depois da ativação (iniciado_em E created_at,
--    os dois gravados pelo servidor): nada de histórico, nada de treino antigo
--    sincronizado depois.
--  • Treino que vale = a regra do carimbo/Tribo (concluído com metade+ das
--    séries, ou extra/livre com séries; nada importado nem cancelado).
--  • Toneladas = carga × reps das séries feitas, sem aquecimento; série em
--    blocos soma bloco a bloco; quem anota “por lado” (preferencias_carga)
--    conta o dobro nos exercícios de anilhas/halteres. Série com carga acima de
--    500 kg ou reps acima de 100 fica de fora até o personal liberar.
--  • 1 contribuição por treino (chave obra+sessão): reenvio não duplica;
--    correção do treino aplica só a diferença e fica no histórico.
--  • Conclusão uma vez só, com a obra travada (for update); participantes e
--    números congelados; avisos de lançamento/inauguração com dedupe.
-- ============================================================================

create table if not exists obras (
  id uuid primary key default gen_random_uuid(),
  ordem integer not null check (ordem between 1 and 1000),
  modelo text not null default 'bairro' check (modelo ~ '^[a-z_]{2,30}$'),
  nome text not null check (length(btrim(nome)) between 3 and 60),
  narrativa text check (narrativa is null or length(narrativa) <= 600),
  area_m2 numeric not null check (area_m2 > 0 and area_m2 <= 1000000),
  materiais_t numeric not null check (materiais_t > 0 and materiais_t <= 10000000),
  meta_kg numeric not null check (meta_kg >= 1000 and meta_kg <= 100000000000),
  banner_dias integer not null default 7 check (banner_dias between 0 and 60),
  mostrar_contribuicoes boolean not null default true,
  estado text not null default 'rascunho' check (estado in ('rascunho', 'ativa', 'concluida')),
  ativada_em timestamptz,
  ativada_por uuid references profiles(id) on delete set null,
  config_ativacao jsonb,
  concluida_em timestamptz,
  total_kg_final numeric,
  participantes_final integer,
  treinos_final integer,
  criada_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists obras_uma_ativa on obras ((true)) where estado = 'ativa';
create unique index if not exists obras_ordem on obras (ordem);
alter table obras enable row level security;
drop policy if exists obras_le on obras;
create policy obras_le on obras for select using ((select public.is_treinador()) or (estado <> 'rascunho' and auth.uid() is not null));
drop policy if exists obras_cria on obras;
create policy obras_cria on obras for insert with check ((select public.is_treinador()) and estado = 'rascunho');
drop policy if exists obras_altera on obras;
create policy obras_altera on obras for update using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists obras_apaga on obras;
create policy obras_apaga on obras for delete using ((select public.is_treinador()) and estado = 'rascunho');

-- Depois de ativada, nada muda em silêncio: só as funções desta migration
-- (marcadas com montinho.obra = on) mexem; o personal só ajusta os dias do destaque.
create or replace function public.obras_protege() returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('montinho.obra', true), '') = 'on' then
    new.updated_at := now();
    return new;
  end if;
  if new.estado is distinct from old.estado then raise exception 'A obra só muda de etapa pelas funções da Academia da Tribo.'; end if;
  if old.estado <> 'rascunho' then
    if (new.ordem, new.modelo, new.nome, new.area_m2, new.materiais_t, new.meta_kg, new.ativada_em, new.ativada_por, new.config_ativacao, new.concluida_em, new.total_kg_final, new.participantes_final, new.treinos_final)
       is distinct from (old.ordem, old.modelo, old.nome, old.area_m2, old.materiais_t, old.meta_kg, old.ativada_em, old.ativada_por, old.config_ativacao, old.concluida_em, old.total_kg_final, old.participantes_final, old.treinos_final) then
      raise exception 'Obra já ativada: só dá para mudar os dias do destaque, a narrativa e a exibição das contribuições. Correções vão em ajustes com motivo.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists obras_protege on obras;
create trigger obras_protege before update on obras for each row execute function public.obras_protege();

create table if not exists obra_contribuicoes (
  obra_id uuid not null references obras(id) on delete restrict,
  session_id uuid not null references training_sessions(id) on delete restrict,
  aluno_id uuid not null references alunos(id) on delete restrict,
  kg numeric not null default 0 check (kg >= 0),
  series_conferir integer not null default 0,
  treino_em timestamptz not null,
  registrada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  primary key (obra_id, session_id)
);
create index if not exists obra_contribuicoes_aluno on obra_contribuicoes (obra_id, aluno_id);
create index if not exists obra_contribuicoes_dia on obra_contribuicoes (obra_id, treino_em);
alter table obra_contribuicoes enable row level security;
drop policy if exists obra_contribuicoes_le on obra_contribuicoes;
create policy obra_contribuicoes_le on obra_contribuicoes for select using ((select public.is_treinador()) or aluno_id = (select public.aluno_id_atual()));
-- Sem escrita pelo app: só as funções.

create table if not exists obra_historico (
  id bigserial primary key,
  obra_id uuid not null references obras(id) on delete restrict,
  session_id uuid,
  aluno_id uuid,
  kg_antes numeric not null,
  kg_depois numeric not null,
  motivo text not null,
  em timestamptz not null default now()
);
alter table obra_historico enable row level security;
drop policy if exists obra_historico_le on obra_historico;
create policy obra_historico_le on obra_historico for select using ((select public.is_treinador()));

create table if not exists obra_ajustes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete restrict,
  aluno_id uuid references alunos(id) on delete set null,
  kg numeric not null check (kg <> 0 and abs(kg) <= 10000000),
  motivo text not null check (length(btrim(motivo)) between 5 and 300),
  criado_por uuid references profiles(id) on delete set null default auth.uid(),
  em timestamptz not null default now()
);
alter table obra_ajustes enable row level security;
drop policy if exists obra_ajustes_le on obra_ajustes;
create policy obra_ajustes_le on obra_ajustes for select using ((select public.is_treinador()));

-- Série acima do limite que o personal confirmou que é de verdade.
create table if not exists obra_liberacoes (
  set_id uuid primary key references session_sets(id) on delete cascade,
  motivo text not null check (length(btrim(motivo)) between 3 and 300),
  criado_por uuid references profiles(id) on delete set null default auth.uid(),
  em timestamptz not null default now()
);
alter table obra_liberacoes enable row level security;
drop policy if exists obra_liberacoes_le on obra_liberacoes;
create policy obra_liberacoes_le on obra_liberacoes for select using ((select public.is_treinador()));

-- Participantes congelados na inauguração (o memorial nunca muda).
create table if not exists obra_participantes (
  obra_id uuid not null references obras(id) on delete restrict,
  aluno_id uuid not null references alunos(id) on delete restrict,
  kg numeric not null,
  treinos integer not null,
  primeiro_em timestamptz not null,
  primary key (obra_id, aluno_id)
);
alter table obra_participantes enable row level security;
drop policy if exists obra_participantes_le on obra_participantes;
create policy obra_participantes_le on obra_participantes for select using ((select public.is_treinador()) or aluno_id = (select public.aluno_id_atual()));

-- Nada histórico pode ser alterado/apagado pelo app.
create or replace function public.obra_imutavel() returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('montinho.obra', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception 'Registro da Academia da Tribo não pode ser alterado.';
end $$;
drop trigger if exists obra_historico_imutavel on obra_historico;
create trigger obra_historico_imutavel before update or delete on obra_historico for each row execute function public.obra_imutavel();
drop trigger if exists obra_ajustes_imutavel on obra_ajustes;
create trigger obra_ajustes_imutavel before update or delete on obra_ajustes for each row execute function public.obra_imutavel();
drop trigger if exists obra_participantes_imutavel on obra_participantes;
create trigger obra_participantes_imutavel before update or delete on obra_participantes for each row execute function public.obra_imutavel();

-- ---------------------------------------------------------------------------
-- Toneladas de um treino (espelho de kgDaSessao em src/lib/academia/regras.ts)
-- ---------------------------------------------------------------------------
create or replace function public.obra_kg_sessao(p_session uuid)
returns table (kg numeric, conferir integer)
language sql stable security definer set search_path = public as $$
  with s as (select ts.id, ts.aluno_id from training_sessions ts where ts.id = p_session),
  pref as (select pc.anilhas, pc.halteres from s left join preferencias_carga pc on pc.aluno_id = s.aluno_id),
  linhas as (
    select st.id, st.carga_kg, st.reps, st.blocos,
           coalesce(eb.equipamento::text[], '{}'::text[]) as eq,
           translate(lower(coalesce(eb.nome, se.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') as nome,
           coalesce(se.prescricao ->> 'unilateral', '') = 'true' as uni,
           exists (select 1 from obra_liberacoes l where l.set_id = st.id) as liberada
      from session_sets st
      join session_exercises se on se.id = st.session_exercise_id
      left join exercicios_biblioteca eb on eb.id = se.biblioteca_id
     where st.session_id = p_session and st.tipo <> 'aquecimento'
  ),
  tipo as (
    select l.*,
           case
             when 'halter' = any(l.eq) then case when l.uni or l.nome ~ '(unilateral|goblet|frances|serrote|pull ?over|um halter|1 halter)' then null else 'halteres' end
             when l.eq && array['barra','barra_w','smith','anilha']::text[] or l.nome ~ '(leg ?press 45|hack)' then 'anilhas'
           end as tipo_peso
      from linhas l
  ),
  bruto as (
    select t.*,
           case when t.blocos is not null and jsonb_typeof(t.blocos) = 'array' and jsonb_array_length(t.blocos) > 0
                then (select coalesce(sum(coalesce(nullif(b ->> 'carga', '')::numeric, t.carga_kg, 0) * coalesce(nullif(b ->> 'reps', '')::numeric, 0)), 0)
                        from jsonb_array_elements(t.blocos) b)
                else coalesce(t.carga_kg, 0) * coalesce(t.reps, 0) end as kg_serie,
           (coalesce(t.carga_kg, 0) > 500 or coalesce(t.reps, 0) > 100) and not t.liberada as fora
      from tipo t
  )
  select coalesce(sum(case when b.fora or b.kg_serie <= 0 then 0
                           else b.kg_serie * case when (b.tipo_peso = 'anilhas' and (select anilhas from pref) = 'por_lado')
                                                    or (b.tipo_peso = 'halteres' and (select halteres from pref) = 'por_lado') then 2 else 1 end end), 0)::numeric,
         count(*) filter (where b.fora)::int
    from bruto b;
$$;
revoke all on function public.obra_kg_sessao(uuid) from public, anon, authenticated;

-- Treino que vale: a mesma regra do carimbo / Tribo (0115).
create or replace function public.obra_sessao_vale(s training_sessions) returns boolean language sql stable set search_path = public as $$
  select s.status <> 'em_andamento'
     and coalesce(s.origem, '') <> 'importado'
     and s.conta_aderencia is distinct from false
     and coalesce(s.series_concluidas, 0) > 0
     and (s.modo = 'extra' or (s.status <> 'abandonada' and (coalesce(s.series_planejadas, 0) = 0 or s.series_concluidas::numeric / s.series_planejadas >= 0.5)));
$$;

-- Quem recebe os avisos coletivos: alunos ativos e visitantes em dia.
create or replace function public.obra_publico() returns table (profile_id uuid) language sql stable security definer set search_path = public as $$
  select distinct a.profile_id from alunos a
   where a.status = 'ativo' and a.profile_id is not null
     and (coalesce(a.modalidade, '') <> 'visitante'
          or exists (select 1 from acessos_visitante v where v.aluno_id = a.id and (v.fim is null or v.fim > now())));
$$;
revoke all on function public.obra_publico() from public, anon, authenticated;

create or replace function public.obra_total_kg(p_obra uuid) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select sum(kg) from obra_contribuicoes where obra_id = p_obra), 0) + coalesce((select sum(kg) from obra_ajustes where obra_id = p_obra), 0);
$$;
revoke all on function public.obra_total_kg(uuid) from public, anon, authenticated;

-- Inaugura (uma vez só; quem chama já travou a obra).
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
  select p.profile_id, 'desafio', left('obra:' || p_obra || ':inauguracao:' || p.profile_id, 120), now(), now() + interval '3 days',
         jsonb_build_object('titulo', '🎉 INAUGURAMOS NOSSA ACADEMIA!',
                            'corpo', 'A tribo conseguiu! A ' || o.nome || ' está oficialmente concluída. Foram ' ||
                                     replace(to_char(round(v_total / 1000), 'FM999,999,999'), ',', '.') || ' toneladas movimentadas por ' || v_pessoas ||
                                     case when v_pessoas = 1 then ' participante' else ' participantes' end || '. Venha conhecer a obra que construímos juntos!',
                            'url', '/aluno/academia/' || p_obra)
    from public.obra_publico() p
  on conflict (dedupe) do nothing;
end $$;
revoke all on function public.obra_concluir_interno(uuid) from public, anon, authenticated;

-- Registra (ou corrige) a contribuição de 1 treino na obra ativa.
create or replace function public.obra_registrar_interno(p_session uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  o obras%rowtype;
  s training_sessions%rowtype;
  v_kg numeric := 0;
  v_conf integer := 0;
  v_antes numeric;
  v_vale boolean;
begin
  select * into s from training_sessions where id = p_session;
  if not found then return; end if;
  -- A obra em que o treino caiu: ativa e começada antes do treino.
  select * into o from obras where estado = 'ativa' and ativada_em <= s.iniciado_em and ativada_em <= s.created_at for update;
  if not found then return; end if;
  v_vale := public.obra_sessao_vale(s);
  if v_vale then
    select k.kg, k.conferir into v_kg, v_conf from public.obra_kg_sessao(p_session) k;
  end if;
  v_kg := round(coalesce(v_kg, 0), 1);
  perform set_config('montinho.obra', 'on', true);
  select kg into v_antes from obra_contribuicoes where obra_id = o.id and session_id = p_session;
  if v_antes is null then
    if v_kg <= 0 and v_conf = 0 then return; end if;
    insert into obra_contribuicoes (obra_id, session_id, aluno_id, kg, series_conferir, treino_em)
    values (o.id, p_session, s.aluno_id, v_kg, v_conf, s.iniciado_em);
    insert into obra_historico (obra_id, session_id, aluno_id, kg_antes, kg_depois, motivo) values (o.id, p_session, s.aluno_id, 0, v_kg, 'treino');
  elsif v_antes <> v_kg then
    update obra_contribuicoes set kg = v_kg, series_conferir = v_conf, atualizada_em = now() where obra_id = o.id and session_id = p_session;
    insert into obra_historico (obra_id, session_id, aluno_id, kg_antes, kg_depois, motivo)
    values (o.id, p_session, s.aluno_id, v_antes, v_kg, case when v_vale then 'treino corrigido' else 'treino deixou de valer' end);
  else
    update obra_contribuicoes set series_conferir = v_conf where obra_id = o.id and session_id = p_session and series_conferir <> v_conf;
  end if;
  perform public.obra_concluir_interno(o.id);
end $$;
revoke all on function public.obra_registrar_interno(uuid) from public, anon, authenticated;

-- Chamado pelo app no fim do treino (o próprio aluno ou o personal).
create or replace function public.obra_sincronizar(p_session uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_aluno uuid;
begin
  select aluno_id into v_aluno from training_sessions where id = p_session;
  if v_aluno is null then return; end if;
  if not (public.is_treinador() or v_aluno = public.aluno_id_atual()) then raise exception 'não autorizado'; end if;
  perform public.obra_registrar_interno(p_session);
end $$;
revoke all on function public.obra_sincronizar(uuid) from public, anon;
grant execute on function public.obra_sincronizar(uuid) to authenticated;

-- Agendador (a cada 5 min): pega treinos feitos sem internet e correções dos últimos 3 dias.
create or replace function public.obra_sincronizar_agendador(p_chave text) returns integer language plpgsql security definer set search_path = public as $$
declare
  o obras%rowtype;
  r record;
  n integer := 0;
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  select * into o from obras where estado = 'ativa';
  if not found then return 0; end if;
  for r in
    select ts.id from training_sessions ts
     where ts.status <> 'em_andamento' and ts.iniciado_em >= o.ativada_em and ts.created_at >= o.ativada_em
       and greatest(coalesce(ts.finalizado_em, ts.iniciado_em), coalesce(ts.updated_at, ts.iniciado_em)) > now() - interval '3 days'
     order by ts.iniciado_em
  loop
    perform public.obra_registrar_interno(r.id);
    n := n + 1;
    exit when not exists (select 1 from obras where id = o.id and estado = 'ativa');
  end loop;
  return n;
end $$;
revoke all on function public.obra_sincronizar_agendador(text) from public, authenticated;
grant execute on function public.obra_sincronizar_agendador(text) to anon;

-- Ativação oficial: só o personal, com a palavra de confirmação.
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
  select p.profile_id, 'desafio', left('obra:' || p_obra || ':lancamento:' || p.profile_id, 120), now(), now() + interval '3 days',
         jsonb_build_object('titulo', '🏗️ A TRIBO VAI CONSTRUIR UMA ACADEMIA!',
                            'corpo', 'Nossa ' || case when o.ordem = 1 then 'primeira obra' else o.ordem || 'ª obra' end || ' começou! Cada tonelada movimentada na musculação vai ajudar a construir a ' || o.nome || '. Venha fazer parte dessa história!',
                            'url', '/aluno/academia')
    from public.obra_publico() p
  on conflict (dedupe) do nothing;
  return v_agora;
end $$;
revoke all on function public.obra_ativar(uuid, text) from public, anon;
grant execute on function public.obra_ativar(uuid, text) to authenticated;

-- Correção do personal: sempre com motivo, sempre no histórico.
create or replace function public.obra_ajustar(p_obra uuid, p_kg numeric, p_motivo text, p_aluno uuid default null) returns void language plpgsql security definer set search_path = public as $$
declare o obras%rowtype;
begin
  if not public.is_treinador() then raise exception 'não autorizado'; end if;
  select * into o from obras where id = p_obra for update;
  if not found or o.estado <> 'ativa' then raise exception 'Só dá para ajustar a obra em andamento.'; end if;
  if public.obra_total_kg(p_obra) + p_kg < 0 then raise exception 'O ajuste deixaria a obra negativa.'; end if;
  perform set_config('montinho.obra', 'on', true);
  insert into obra_ajustes (obra_id, aluno_id, kg, motivo) values (p_obra, p_aluno, p_kg, btrim(p_motivo));
  insert into obra_historico (obra_id, aluno_id, kg_antes, kg_depois, motivo) values (p_obra, p_aluno, 0, p_kg, 'ajuste: ' || btrim(p_motivo));
  perform public.obra_concluir_interno(p_obra);
end $$;
revoke all on function public.obra_ajustar(uuid, numeric, text, uuid) from public, anon;
grant execute on function public.obra_ajustar(uuid, numeric, text, uuid) to authenticated;

-- Libera uma série acima do limite (o personal confirmou) e recalcula o treino.
create or replace function public.obra_liberar_serie(p_set uuid, p_motivo text) returns void language plpgsql security definer set search_path = public as $$
declare v_sessao uuid;
begin
  if not public.is_treinador() then raise exception 'não autorizado'; end if;
  select session_id into v_sessao from session_sets where id = p_set;
  if v_sessao is null then raise exception 'Série não encontrada.'; end if;
  insert into obra_liberacoes (set_id, motivo) values (p_set, btrim(p_motivo)) on conflict (set_id) do nothing;
  perform public.obra_registrar_interno(v_sessao);
end $$;
revoke all on function public.obra_liberar_serie(uuid, text) from public, anon;
grant execute on function public.obra_liberar_serie(uuid, text) to authenticated;

-- Séries que ficaram de fora esperando o personal.
create or replace function public.obra_para_conferir(p_obra uuid)
returns table (set_id uuid, session_id uuid, aluno text, exercicio text, carga numeric, reps integer, treino_em timestamptz)
language sql stable security definer set search_path = public as $$
  select st.id, st.session_id, p.nome, se.nome, st.carga_kg, st.reps, c.treino_em
    from obra_contribuicoes c
    join session_sets st on st.session_id = c.session_id
    join session_exercises se on se.id = st.session_exercise_id
    join alunos a on a.id = c.aluno_id
    left join profiles p on p.id = a.profile_id
   where public.is_treinador() and c.obra_id = p_obra and c.series_conferir > 0
     and st.tipo <> 'aquecimento' and (coalesce(st.carga_kg, 0) > 500 or coalesce(st.reps, 0) > 100)
     and not exists (select 1 from obra_liberacoes l where l.set_id = st.id)
   order by c.treino_em desc;
$$;
revoke all on function public.obra_para_conferir(uuid) from public, anon;
grant execute on function public.obra_para_conferir(uuid) to authenticated;

-- Números da obra para a tela (sem quem é quem para o aluno).
create or replace function public.obra_dados(p_obra uuid default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  o obras%rowtype;
  v_eu uuid := public.aluno_id_atual();
  v_personal boolean := public.is_treinador();
begin
  if auth.uid() is null then return null; end if;
  if p_obra is null then
    select * into o from obras where estado = 'ativa';
    if not found then select * into o from obras where estado = 'concluida' order by concluida_em desc limit 1; end if;
  else
    select * into o from obras where id = p_obra;
  end if;
  if not found or (o.estado = 'rascunho' and not v_personal) then return null; end if;
  return jsonb_build_object(
    'id', o.id, 'ordem', o.ordem, 'modelo', o.modelo, 'nome', o.nome, 'narrativa', o.narrativa,
    'area_m2', o.area_m2, 'materiais_t', o.materiais_t, 'meta_kg', o.meta_kg, 'banner_dias', o.banner_dias,
    'mostrar_contribuicoes', o.mostrar_contribuicoes, 'estado', o.estado,
    'ativada_em', o.ativada_em, 'concluida_em', o.concluida_em,
    'total_kg', case when o.estado = 'concluida' then o.total_kg_final else public.obra_total_kg(o.id) end,
    'participantes', case when o.estado = 'concluida' then o.participantes_final
                          else (select count(distinct c.aluno_id) from obra_contribuicoes c where c.obra_id = o.id and c.kg > 0) end,
    'treinos', case when o.estado = 'concluida' then o.treinos_final
                    else (select count(*) from obra_contribuicoes c where c.obra_id = o.id and c.kg > 0) end,
    'meu_kg', (select coalesce(sum(c.kg), 0) from obra_contribuicoes c where c.obra_id = o.id and c.aluno_id = v_eu),
    'meus_treinos', (select count(*) from obra_contribuicoes c where c.obra_id = o.id and c.aluno_id = v_eu and c.kg > 0),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'kg', d.kg) order by d.dia), '[]'::jsonb)
                  from (select (c.treino_em at time zone 'America/Sao_Paulo')::date as dia, sum(c.kg) as kg
                          from obra_contribuicoes c where c.obra_id = o.id and c.treino_em > coalesce(o.concluida_em, now()) - interval '28 days'
                         group by 1) d)
  );
end $$;
revoke all on function public.obra_dados(uuid) from public, anon;
grant execute on function public.obra_dados(uuid) to authenticated;

-- Quem fez parte: nome curto (personal vê o completo); quem se esconde do ranking vira “Atleta da Tribo”.
create or replace function public.obra_participantes_lista(p_obra uuid)
returns table (nome text, kg numeric, treinos integer, eu boolean)
language sql stable security definer set search_path = public as $$
  with o as (select * from obras where id = p_obra and (estado <> 'rascunho' or public.is_treinador()) and auth.uid() is not null),
  base as (
    select pa.aluno_id, pa.kg, pa.treinos from obra_participantes pa join o on o.id = pa.obra_id where o.estado = 'concluida'
    union all
    select c.aluno_id, sum(c.kg), count(*)::int from obra_contribuicoes c join o on o.id = c.obra_id
     where o.estado = 'ativa' and c.kg > 0 group by c.aluno_id
  )
  select case when public.is_treinador() then coalesce(p.nome, 'Aluno')
              when b.aluno_id = public.aluno_id_atual() or coalesce(a.ranking_visivel, false) then public.nome_curto(p.nome)
              else 'Atleta da Tribo' end,
         case when public.is_treinador() or (select mostrar_contribuicoes from o) then round(b.kg) end,
         b.treinos,
         b.aluno_id = public.aluno_id_atual()
    from base b join alunos a on a.id = b.aluno_id left join profiles p on p.id = a.profile_id
   order by b.kg desc;
$$;
revoke all on function public.obra_participantes_lista(uuid) from public, anon;
grant execute on function public.obra_participantes_lista(uuid) to authenticated;

-- Ritmo recente da comunidade (só para o simulador do personal; nunca abastece a obra).
create or replace function public.obra_ritmo_semanal(p_semanas integer default 8)
returns table (semana date, treinos integer, pessoas integer, kg numeric)
language sql stable security definer set search_path = public as $$
  select date_trunc('week', (ts.iniciado_em at time zone 'America/Sao_Paulo'))::date,
         count(*)::int, count(distinct ts.aluno_id)::int, sum(k.kg)
    from training_sessions ts cross join lateral public.obra_kg_sessao(ts.id) k
   where public.is_treinador() and public.obra_sessao_vale(ts)
     and ts.iniciado_em > now() - make_interval(weeks => least(greatest(p_semanas, 1), 26))
   group by 1 order by 1;
$$;
revoke all on function public.obra_ritmo_semanal(integer) from public, anon;
grant execute on function public.obra_ritmo_semanal(integer) to authenticated;
