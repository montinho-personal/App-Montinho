-- ============================================================================
-- 0115 — Conquistas da Tribo (gamificação coletiva, pedido do Montinho em
-- 29/10/2026). ADIÇÃO: nada do que existe muda.
--
-- • Os troféus coletivos ficam numa tabela PRÓPRIA (tribo_conquistas), fora de
--   conquistas_aluno: o ranking, a sala de troféus individual, a Jornada, os
--   carimbos e as contagens “troféus X de Y” continuam exatamente iguais.
-- • Os números saem dos registros reais (nada paralelo):
--     cardio  = dias de cardio VÁLIDOS pela mesma regra do app
--               (src/lib/cardio/regras.ts: registros + extras de cardio + Strava
--               sem contar a mesma atividade duas vezes; 10+ min e 50%+ do
--               prescrito no dia; “não realizado” e excluídos não contam);
--     treinos = a mesma regra do carimbo (src/lib/conquistas/carimbos.ts:
--               concluído com metade das séries ou extra/livre com séries; nada
--               importado, cancelado ou parcial).
--   Corrigiu/excluiu um registro → o total muda junto (é sempre recalculado).
-- • Marcos em tribo_marcos (nova linha = novo marco, sem reescrever nada).
-- • Concessão SÓ pelo banco (tribo_sincronizar, security definer): o aluno não
--   insere troféu da tribo direto. Idempotente (único por aluno+código+ref.)
--   e auditável (método, data, contribuição). Troféu dado nunca é retirado.
--     participação = alguma contribuição válida do aluno dentro da faixa
--                    (marco anterior, marco] na ordem cronológica;
--     recuperação  = 10% do marco (arredondado para cima, mínimo 1) em
--                    minutos/treinos do próprio aluno, acumulados (não zeram).
-- • Missões coletivas (tribo_missoes): só o personal cria/ativa; histórico
--   preservado (sem DELETE); “recorrente” cria a cópia do próximo período.
-- • tribo_dados(): números para a tela. Para aluno, nada identifica os outros
--   (sem id, sem nome): só instante, minutos e modalidade. Personal vê o aluno.
-- Idempotente.
-- ============================================================================

-- Marcos ---------------------------------------------------------------------
create table if not exists tribo_marcos (
  trilha text not null check (trilha in ('cardio','treinos')),
  marco integer not null check (marco > 0 and marco <= 100000000),
  nome text not null check (length(nome) between 1 and 60),
  primary key (trilha, marco)
);
alter table tribo_marcos enable row level security;
drop policy if exists tribo_marcos_le on tribo_marcos;
create policy tribo_marcos_le on tribo_marcos for select using (auth.uid() is not null);
-- Sem escrita pelo app: marco novo entra por migration.

insert into tribo_marcos (trilha, marco, nome) values
  ('cardio', 1000, 'A Tribo Despertou'),
  ('cardio', 5000, 'Energia Coletiva'),
  ('cardio', 10000, 'Dez Mil Razões'),
  ('cardio', 15000, 'Tribo Incansável'),
  ('cardio', 25000, 'Força da Tribo'),
  ('cardio', 50000, 'Lenda do Chalalá'),
  ('cardio', 100000, 'Uma Tribo, Uma Lenda'),
  ('treinos', 10, 'Primeira Faísca'),
  ('treinos', 25, 'Tribo em Movimento'),
  ('treinos', 50, 'Ferro Coletivo'),
  ('treinos', 100, 'Cem Vezes Juntos'),
  ('treinos', 250, 'Tribo de Aço'),
  ('treinos', 500, 'Muralha da Tribo'),
  ('treinos', 1000, 'Mil Treinos, Uma Tribo')
on conflict (trilha, marco) do nothing;

-- Missões coletivas ----------------------------------------------------------
create table if not exists tribo_missoes (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) between 3 and 60),
  descricao text check (descricao is null or length(descricao) <= 300),
  meta_minutos integer check (meta_minutos is null or meta_minutos between 10 and 10000000),
  meta_treinos integer check (meta_treinos is null or meta_treinos between 1 and 1000000),
  inicio date not null,
  fim date not null,
  recorrente boolean not null default false,
  ativa boolean not null default true,
  criada_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (fim >= inicio and fim - inicio <= 366),
  check (meta_minutos is not null or meta_treinos is not null),
  unique (serie_id, inicio)
);
create index if not exists tribo_missoes_periodo on tribo_missoes (inicio, fim);
alter table tribo_missoes enable row level security;
drop policy if exists tribo_missoes_le on tribo_missoes;
create policy tribo_missoes_le on tribo_missoes for select using ((select public.is_treinador()) or (select public.aluno_id_atual()) is not null);
drop policy if exists tribo_missoes_treinador_cria on tribo_missoes;
create policy tribo_missoes_treinador_cria on tribo_missoes for insert with check ((select public.is_treinador()));
drop policy if exists tribo_missoes_treinador_altera on tribo_missoes;
create policy tribo_missoes_treinador_altera on tribo_missoes for update using ((select public.is_treinador())) with check ((select public.is_treinador()));
-- Sem DELETE: o histórico das missões fica.

-- Troféus da tribo -----------------------------------------------------------
create table if not exists tribo_conquistas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  codigo text not null check (codigo ~ '^tribo_(cardio|treinos)_[0-9]{1,9}$' or codigo = 'tribo_missao'),
  referencia text not null check (length(referencia) between 1 and 64),
  metodo text not null check (metodo in ('participacao','recuperacao','missao')),
  conquistado_em timestamptz not null,
  dados jsonb not null default '{}'::jsonb,
  vista_em timestamptz,
  created_at timestamptz not null default now(),
  unique (aluno_id, codigo, referencia)
);
create index if not exists tribo_conquistas_aluno on tribo_conquistas (aluno_id, conquistado_em desc);
alter table tribo_conquistas enable row level security;
drop policy if exists tribo_conq_treinador_le on tribo_conquistas;
create policy tribo_conq_treinador_le on tribo_conquistas for select using ((select public.is_treinador()));
drop policy if exists tribo_conq_aluno_le on tribo_conquistas;
create policy tribo_conq_aluno_le on tribo_conquistas for select using (aluno_id = (select public.aluno_id_atual()));
-- Marcar como vista: só a coluna vista_em, só nos próprios.
revoke insert, update, delete on tribo_conquistas from anon, authenticated;
grant update (vista_em) on tribo_conquistas to authenticated;
drop policy if exists tribo_conq_aluno_vista on tribo_conquistas;
create policy tribo_conq_aluno_vista on tribo_conquistas for update
  using (aluno_id = (select public.aluno_id_atual()))
  with check (aluno_id = (select public.aluno_id_atual()));

-- Contribuições válidas (interna) ---------------------------------------------
create or replace function public.tribo_contribuicoes()
returns table (aluno_id uuid, trilha text, em timestamptz, minutos integer, chave text, modalidade text)
language sql
stable
security definer
set search_path = public
as $$
  with reg as (
    select r.aluno_id, r.data, r.realizado_em as em, r.duracao_min::int as minutos, r.planejado_min::int as plan,
           r.modalidade::text as modalidade, 'r:' || r.id as chave, r.status
    from cardio_registros r
    where r.removido_em is null
  ),
  ext as (
    select s.aluno_id, (s.iniciado_em at time zone 'America/Sao_Paulo')::date as data,
           coalesce(s.finalizado_em, s.iniciado_em) as em,
           round(coalesce(s.duracao_seg, 0) / 60.0)::int as minutos,
           case when (s.snapshot -> 'extra' ->> 'duracao_min') ~ '^[0-9]+(\.[0-9]+)?$' then round((s.snapshot -> 'extra' ->> 'duracao_min')::numeric)::int end as plan,
           'outro'::text as modalidade, 'x:' || s.id as chave
    from training_sessions s
    where s.modo = 'extra' and s.status = 'concluida'
      and coalesce(s.snapshot -> 'extra' ->> 'modalidade', '') like 'cardio%'
      and not exists (select 1 from cardio_registros r where r.session_id = s.id and r.aluno_id = s.aluno_id and r.removido_em is null)
  ),
  manuais as (
    select aluno_id, data, em, minutos, plan, modalidade, chave from reg where status <> 'nao_realizado'
    union all
    select aluno_id, data, em, minutos, plan, modalidade, chave from ext
  ),
  stv as (
    select c.aluno_id, (c.inicio at time zone 'America/Sao_Paulo')::date as data, c.inicio as em,
           round(c.duracao_seg / 60.0)::int as minutos, null::int as plan, c.tipo as modalidade, 's:' || c.atividade_id as chave
    from cardios_strava c
    where not exists (
      select 1 from manuais m
      where m.aluno_id = c.aluno_id and m.data = (c.inicio at time zone 'America/Sao_Paulo')::date
        and abs(extract(epoch from (m.em - c.inicio))) <= 3 * 3600
    )
  ),
  pecas as (
    select * from manuais where minutos > 0
    union all
    select * from stv where minutos > 0
  ),
  dia as (
    select p.*,
           sum(p.minutos) over (partition by p.aluno_id, p.data order by p.em, p.chave rows unbounded preceding) as acum,
           greatest(10, ceil(coalesce(max(p.plan) over (partition by p.aluno_id, p.data), 0) * 0.5))::int as precisa
    from pecas p
  ),
  valido as (
    select d.*, min(d.em) filter (where d.acum >= d.precisa) over (partition by d.aluno_id, d.data) as valido_em
    from dia d
  )
  select v.aluno_id, 'cardio'::text, greatest(v.em, v.valido_em), v.minutos, v.chave, v.modalidade
  from valido v
  where v.valido_em is not null
  union all
  select s.aluno_id, 'treinos'::text, coalesce(s.finalizado_em, s.iniciado_em), 0, 't:' || s.id, null::text
  from training_sessions s
  where s.status <> 'em_andamento'
    and coalesce(s.origem, '') <> 'importado'
    and s.conta_aderencia is distinct from false
    and coalesce(s.series_concluidas, 0) > 0
    and (s.modo = 'extra'
         or (s.status <> 'abandonada' and (coalesce(s.series_planejadas, 0) = 0 or s.series_concluidas::numeric / s.series_planejadas >= 0.5)));
$$;
revoke all on function public.tribo_contribuicoes() from public, anon, authenticated;

-- Missões recorrentes: cria a cópia do período seguinte (interna) -------------
create or replace function public.tribo_renovar_missoes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ini date;
  v_fim date;
  v_mensal boolean;
  n int;
begin
  for r in
    select * from (select distinct on (m.serie_id) m.* from tribo_missoes m order by m.serie_id, m.inicio desc) u
    where u.recorrente and u.ativa and u.fim < v_hoje
  loop
    v_mensal := extract(day from r.inicio) = 1 and r.fim = (date_trunc('month', r.inicio) + interval '1 month - 1 day')::date;
    v_ini := r.fim + 1;
    n := 0;
    while v_ini <= v_hoje and n < 36 loop
      v_fim := case when v_mensal then (date_trunc('month', v_ini) + interval '1 month - 1 day')::date else v_ini + (r.fim - r.inicio) end;
      insert into tribo_missoes (serie_id, nome, descricao, meta_minutos, meta_treinos, inicio, fim, recorrente, ativa, criada_por)
        values (r.serie_id, r.nome, r.descricao, r.meta_minutos, r.meta_treinos, v_ini, v_fim, true, true, r.criada_por)
        on conflict (serie_id, inicio) do nothing;
      v_ini := v_fim + 1;
      n := n + 1;
    end loop;
  end loop;
end $$;
revoke all on function public.tribo_renovar_missoes() from public, anon, authenticated;

-- Números da tribo para a tela -----------------------------------------------
create or replace function public.tribo_dados()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tr boolean := public.is_treinador();
  v_eu uuid := public.aluno_id_atual();
  v_out jsonb;
begin
  if auth.uid() is null or (not v_tr and v_eu is null) then return null; end if;
  perform public.tribo_renovar_missoes();
  with c as (select * from public.tribo_contribuicoes())
  select jsonb_build_object(
    'eu', v_eu,
    'treinador', v_tr,
    'contribuicoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               't', case when c.trilha = 'cardio' then 'c' else 't' end,
               'em', c.em,
               'min', c.minutos,
               'mod', c.modalidade,
               'eu', c.aluno_id = v_eu,
               'a', case when v_tr or c.aluno_id = v_eu then c.aluno_id end
             ) order by c.em, c.chave)
      from c), '[]'::jsonb),
    'participantes', jsonb_build_object(
      'cardio', (select count(distinct c.aluno_id) from c where c.trilha = 'cardio'),
      'treinos', (select count(distinct c.aluno_id) from c where c.trilha = 'treinos'),
      'total', (select count(distinct c.aluno_id) from c)),
    'marcos', coalesce((select jsonb_agg(jsonb_build_object('trilha', m.trilha, 'marco', m.marco, 'nome', m.nome) order by m.trilha, m.marco) from tribo_marcos m), '[]'::jsonb),
    'missoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', ms.id, 'nome', ms.nome, 'descricao', ms.descricao, 'meta_minutos', ms.meta_minutos, 'meta_treinos', ms.meta_treinos,
               'inicio', ms.inicio, 'fim', ms.fim, 'recorrente', ms.recorrente, 'ativa', ms.ativa,
               'participantes', (select count(distinct c.aluno_id) from c
                                  where c.em >= (ms.inicio::timestamp at time zone 'America/Sao_Paulo')
                                    and c.em < ((ms.fim + 1)::timestamp at time zone 'America/Sao_Paulo')
                                    and ((c.trilha = 'cardio' and ms.meta_minutos is not null) or (c.trilha = 'treinos' and ms.meta_treinos is not null)))
             ) order by ms.inicio desc, ms.created_at desc)
      from tribo_missoes ms), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.tribo_dados() from public, anon;
grant execute on function public.tribo_dados() to authenticated;

-- Concessão dos troféus da tribo para o aluno logado -------------------------
create or replace function public.tribo_sincronizar()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid := public.aluno_id_atual();
  v_novos jsonb;
begin
  if auth.uid() is null or v_aluno is null then return '[]'::jsonb; end if;
  perform public.tribo_renovar_missoes();
  -- Um aluno por vez: duas telas abertas ao mesmo tempo não brigam.
  perform pg_advisory_xact_lock(hashtext('tribo:' || v_aluno::text));

  with c as (select * from public.tribo_contribuicoes()),
  ordem as (
    select c.*, case when c.trilha = 'cardio' then c.minutos else 1 end as qtd,
           sum(case when c.trilha = 'cardio' then c.minutos else 1 end) over (partition by c.trilha order by c.em, c.chave rows unbounded preceding) as acum
    from c
  ),
  meu as (
    select o.trilha, o.em, sum(o.qtd) over (partition by o.trilha order by o.em, o.chave rows unbounded preceding) as meu_acum
    from ordem o where o.aluno_id = v_aluno
  ),
  marcos as (
    select m.trilha, m.marco, m.nome,
           coalesce(lag(m.marco) over (partition by m.trilha order by m.marco), 0) as anterior,
           (select min(o.em) from ordem o where o.trilha = m.trilha and o.acum >= m.marco) as alcancado_em
    from tribo_marcos m
  ),
  participacao as (
    select mk.trilha, mk.marco, mk.nome, mk.alcancado_em as em, sum(o.qtd)::int as contrib
    from marcos mk
    join ordem o on o.trilha = mk.trilha and o.aluno_id = v_aluno
                and o.acum - o.qtd < mk.marco and o.acum > mk.anterior
    where mk.alcancado_em is not null
    group by mk.trilha, mk.marco, mk.nome, mk.alcancado_em
  ),
  recuperacao as (
    select mk.trilha, mk.marco, mk.nome,
           greatest(1, ceil(mk.marco * 0.10))::int as meta,
           greatest(mk.alcancado_em, (select min(me.em) from meu me where me.trilha = mk.trilha and me.meu_acum >= greatest(1, ceil(mk.marco * 0.10)))) as em,
           (select coalesce(max(me.meu_acum), 0) from meu me where me.trilha = mk.trilha)::int as acumulado
    from marcos mk
    where mk.alcancado_em is not null
  ),
  marcos_ganhos as (
    select 'tribo_' || p.trilha || '_' || p.marco as codigo, p.marco::text as referencia, 'participacao'::text as metodo, p.em,
           jsonb_build_object('trilha', p.trilha, 'marco', p.marco, 'nome', p.nome, 'contribuicao', p.contrib) as dados
    from participacao p
    union all
    select 'tribo_' || r.trilha || '_' || r.marco, r.marco::text, 'recuperacao', r.em,
           jsonb_build_object('trilha', r.trilha, 'marco', r.marco, 'nome', r.nome, 'meta', r.meta, 'acumulado', r.acumulado)
    from recuperacao r
    where r.em is not null
      and not exists (select 1 from participacao p where p.trilha = r.trilha and p.marco = r.marco)
  ),
  miss as (
    select ms.*, (ms.inicio::timestamp at time zone 'America/Sao_Paulo') as de, ((ms.fim + 1)::timestamp at time zone 'America/Sao_Paulo') as ate
    from tribo_missoes ms
    where ms.ativa
  ),
  mo as (
    select ms.id, o.trilha, o.em, o.aluno_id, o.qtd,
           sum(o.qtd) over (partition by ms.id, o.trilha order by o.em, o.chave rows unbounded preceding) as acum
    from miss ms
    join ordem o on o.em >= ms.de and o.em < ms.ate
                and ((o.trilha = 'cardio' and ms.meta_minutos is not null) or (o.trilha = 'treinos' and ms.meta_treinos is not null))
  ),
  fim_missao as (
    select ms.id, ms.nome, ms.meta_minutos, ms.meta_treinos,
           (select min(mo.em) from mo where mo.id = ms.id and mo.trilha = 'cardio' and mo.acum >= ms.meta_minutos) as em_c,
           (select min(mo.em) from mo where mo.id = ms.id and mo.trilha = 'treinos' and mo.acum >= ms.meta_treinos) as em_t
    from miss ms
  ),
  concluidas as (
    select f.*, greatest(f.em_c, f.em_t) as em
    from fim_missao f
    where (f.meta_minutos is null or f.em_c is not null) and (f.meta_treinos is null or f.em_t is not null)
  ),
  missoes_ganhas as (
    select 'tribo_missao'::text as codigo, k.id::text as referencia, 'missao'::text as metodo, k.em,
           jsonb_build_object('missao_id', k.id, 'nome', k.nome, 'meta_minutos', k.meta_minutos, 'meta_treinos', k.meta_treinos,
             'minutos', (select coalesce(sum(mo.qtd), 0) from mo where mo.id = k.id and mo.aluno_id = v_aluno and mo.trilha = 'cardio' and mo.em <= k.em),
             'treinos', (select coalesce(sum(mo.qtd), 0) from mo where mo.id = k.id and mo.aluno_id = v_aluno and mo.trilha = 'treinos' and mo.em <= k.em)) as dados
    from concluidas k
    where exists (select 1 from mo where mo.id = k.id and mo.aluno_id = v_aluno and mo.em <= k.em)
  ),
  ins as (
    insert into tribo_conquistas (aluno_id, codigo, referencia, metodo, conquistado_em, dados)
    select v_aluno, g.codigo, g.referencia, g.metodo, g.em, g.dados
    from (select * from marcos_ganhos union all select * from missoes_ganhas) g
    on conflict (aluno_id, codigo, referencia) do nothing
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(ins) order by ins.conquistado_em), '[]'::jsonb) into v_novos from ins;
  return v_novos;
end $$;
revoke all on function public.tribo_sincronizar() from public, anon;
grant execute on function public.tribo_sincronizar() to authenticated;
