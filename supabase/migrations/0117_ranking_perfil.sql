-- ============================================================================
-- 0117 — Ranking: tocar no nome abre o perfil (pedido do Montinho, 29/10/2026).
-- ADIÇÃO: a ranking_trofeus_v2() continua igual; a v3 é a mesma conta + `ref`
-- (o id interno da pessoa, só para abrir o perfil).
--   • ranking_perfil(p_aluno): troféus (código + quando ganhou) e os números do
--     desempate. Aluno só vê quem está no ranking (ativo e “aparecer no
--     ranking” ligado) — mesma regra da lista; personal vê todos, nome completo.
--   • Cutucar no ranking: ranking_cutucadas + cutucar_no_ranking() (1 por
--     pessoa por dia), aviso no celular pelo canal dos desafios (0095),
--     minhas_cutucadas_ranking() e ver_cutucadas_ranking().
--   • montinho_no_ranking(): onde o “Meu treino” do personal estaria (sem entrar).
-- Idempotente.
-- ============================================================================
create or replace function public.ranking_trofeus_v3()
returns table (posicao int, nome text, trofeus int, eu boolean, visitante boolean, aderencia_semana int, mesmo_total_acima boolean, ref uuid)
language sql
stable
security definer
set search_path = public
as $$
  with quem as (
    select public.is_treinador() as treinador, (select id from alunos where profile_id = auth.uid()) as meu
  ),
  contagem as (
    select k.aluno_id, count(*)::int as n, max(k.primeira) as chegou_em
    from (
      select c.aluno_id, c.codigo, min(c.conquistado_em) as primeira
      from conquistas_aluno c
      where c.codigo not in ('recorde', 'eu_voltei', 'desafio_concluido', 'cardio_voltei', 'cardio_500', 'cardio_1000', 'retomada_30')
      group by c.aluno_id, c.codigo
    ) k
    group by k.aluno_id
  ),
  base as (
    select a.id, a.modalidade, coalesce(nullif(btrim(p.nome), ''), 'Aluno') as nome_completo, k.n, k.chegou_em,
           d.pct_semana, coalesce(d.carimbos, 0) as carimbos, coalesce(d.semanas_seguidas, 0) as seguidas, d.pct_4sem
    from alunos a
    join contagem k on k.aluno_id = a.id
    left join profiles p on p.id = a.profile_id
    left join ranking_desempate d on d.aluno_id = a.id
    cross join quem
    where auth.uid() is not null
      and (quem.treinador or quem.meu is not null)
      and a.status = 'ativo'
      and k.n > 0
      and (a.ranking_visivel or a.id = quem.meu or quem.treinador)
  ),
  ordenado as (
    select b.*,
           rank() over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as pos,
           lag(b.n) over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as n_acima
    from base b
  )
  select o.pos::int,
         case when (select treinador from quem) then o.nome_completo
              else split_part(o.nome_completo, ' ', 1)
                   || coalesce(' ' || nullif(left(regexp_replace(o.nome_completo, '^.*\s', ''), 1), left(split_part(o.nome_completo, ' ', 1), 1)) || '.', '')
         end,
         o.n,
         o.id = (select meu from quem),
         o.modalidade = 'visitante',
         case when (select treinador from quem) or o.id = (select meu from quem) then o.pct_semana::int end,
         coalesce(o.n_acima = o.n, false),
         o.id
  from ordenado o
  order by 1, 2;
$$;
revoke all on function public.ranking_trofeus_v3() from public, anon;
grant execute on function public.ranking_trofeus_v3() to authenticated;

-- Quem pode ver o perfil de quem: a mesma regra da lista do ranking.
create or replace function public.ranking_pode_ver(p_aluno uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_treinador()
    or p_aluno = public.aluno_id_atual()
    or (public.aluno_id_atual() is not null and exists (select 1 from alunos a where a.id = p_aluno and a.status = 'ativo' and a.ranking_visivel))
  );
$$;
revoke all on function public.ranking_pode_ver(uuid) from public, anon, authenticated;

create or replace function public.ranking_perfil(p_aluno uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_tr boolean := public.is_treinador(); v_eu uuid := public.aluno_id_atual(); v jsonb;
begin
  if not public.ranking_pode_ver(p_aluno) then return null; end if;
  select jsonb_build_object(
    'ref', a.id,
    'nome', case when v_tr then coalesce(nullif(btrim(p.nome), ''), 'Aluno') else public.nome_curto(p.nome) end,
    'eu', a.id = v_eu,
    'visitante', a.modalidade = 'visitante',
    'trofeus', coalesce((select jsonb_agg(jsonb_build_object('codigo', k.codigo, 'em', k.em) order by k.em desc)
                           from (select c.codigo, min(c.conquistado_em) as em from conquistas_aluno c where c.aluno_id = a.id group by c.codigo) k), '[]'::jsonb),
    'desempate', jsonb_build_object('pct_semana', d.pct_semana, 'carimbos', coalesce(d.carimbos, 0), 'semanas_seguidas', coalesce(d.semanas_seguidas, 0), 'pct_4sem', d.pct_4sem),
    'cutuquei_hoje', exists (select 1 from ranking_cutucadas r where r.de_aluno_id = v_eu and r.para_aluno_id = a.id and r.dia = (now() at time zone 'America/Sao_Paulo')::date)
  ) into v
  from alunos a left join profiles p on p.id = a.profile_id left join ranking_desempate d on d.aluno_id = a.id
  where a.id = p_aluno;
  return v;
end $$;
revoke all on function public.ranking_perfil(uuid) from public, anon;
grant execute on function public.ranking_perfil(uuid) to authenticated;

-- Cutucar no ranking ----------------------------------------------------------
create table if not exists ranking_cutucadas (
  id uuid primary key default gen_random_uuid(),
  de_aluno_id uuid not null references alunos(id) on delete cascade,
  para_aluno_id uuid not null references alunos(id) on delete cascade,
  emoji text not null check (emoji in ('🔥', '💪', '😈', '⏰', '👀')),
  dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at timestamptz not null default now(),
  vista_em timestamptz,
  unique (de_aluno_id, para_aluno_id, dia),
  check (de_aluno_id <> para_aluno_id)
);
create index if not exists ranking_cutucadas_para on ranking_cutucadas (para_aluno_id, created_at desc);
alter table ranking_cutucadas enable row level security;
drop policy if exists rank_cut_treinador on ranking_cutucadas;
create policy rank_cut_treinador on ranking_cutucadas for select using ((select public.is_treinador()));
-- Escrita só pelas funções; o aluno lê pelas funções (sem ver ids dos outros).

create or replace function public.cutucar_no_ranking(p_para uuid, p_emoji text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_eu uuid := public.aluno_id_atual();
begin
  if v_eu is null or v_eu = p_para or not public.ranking_pode_ver(p_para) then return false; end if;
  insert into ranking_cutucadas (de_aluno_id, para_aluno_id, emoji) values (v_eu, p_para, p_emoji)
  on conflict (de_aluno_id, para_aluno_id, dia) do nothing;
  return found;
end $$;
revoke all on function public.cutucar_no_ranking(uuid, text) from public, anon;
grant execute on function public.cutucar_no_ranking(uuid, text) to authenticated;

create or replace function public.ranking_notifica_cutucada()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_de text;
begin
  select public.nome_curto(p.nome) into v_de from alunos a left join profiles p on p.id = a.profile_id where a.id = new.de_aluno_id;
  perform public.desafio_enfileirar(new.para_aluno_id, 'ranking_cutucada:' || new.id,
    new.emoji || ' ' || coalesce(v_de, 'Alguém') || ' te cutucou no Ranking!',
    case new.emoji when '🔥' then 'Bora treinar!' when '💪' then 'Tô chegando aí!' when '😈' then 'Vou te passar no ranking!' when '⏰' then 'Cadê você? Bora!' else 'Tô de olho em você!' end,
    '/aluno/ranking', interval '12 hours');
  return new;
end $$;
revoke all on function public.ranking_notifica_cutucada() from public, anon, authenticated;
drop trigger if exists trg_ranking_notifica_cutucada on ranking_cutucadas;
create trigger trg_ranking_notifica_cutucada after insert on ranking_cutucadas for each row execute function public.ranking_notifica_cutucada();

create or replace function public.minhas_cutucadas_ranking()
returns table (id uuid, de text, de_ref uuid, emoji text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, public.nome_curto(p.nome), c.de_aluno_id, c.emoji, c.created_at
    from ranking_cutucadas c join alunos a on a.id = c.de_aluno_id left join profiles p on p.id = a.profile_id
   where c.para_aluno_id = public.aluno_id_atual() and c.vista_em is null
   order by c.created_at desc limit 10;
$$;
revoke all on function public.minhas_cutucadas_ranking() from public, anon;
grant execute on function public.minhas_cutucadas_ranking() to authenticated;

create or replace function public.ver_cutucadas_ranking()
returns void language sql security definer set search_path = public as $$
  update ranking_cutucadas set vista_em = now() where para_aluno_id = public.aluno_id_atual() and vista_em is null;
$$;
revoke all on function public.ver_cutucadas_ranking() from public, anon;
grant execute on function public.ver_cutucadas_ranking() to authenticated;

-- “Você sabia que o Montinho também treina pelo app?” ---------------------------
-- Onde a ficha de aluno do personal (“Meu treino”) estaria no ranking, sem
-- entrar nele: posição pela MESMA ordem do desempate, troféus, carimbos,
-- semanas seguidas e os 3 troféus mais recentes. Qualquer aluno logado vê.
create or replace function public.montinho_no_ranking()
returns jsonb language sql stable security definer set search_path = public as $$
  with fora as (select unnest(array['recorde','eu_voltei','desafio_concluido','cardio_voltei','cardio_500','cardio_1000','retomada_30']) as c),
  m as (
    select a.id from alunos a join profiles p on p.id = a.profile_id
     where p.role = 'treinador' order by a.created_at limit 1
  ),
  contagem as (
    select k.aluno_id, count(*)::int as n, max(k.primeira) as chegou_em
      from (select c.aluno_id, c.codigo, min(c.conquistado_em) as primeira from conquistas_aluno c
             where c.codigo not in (select c from fora) group by c.aluno_id, c.codigo) k
     group by k.aluno_id
  ),
  base as (
    select a.id, k.n, k.chegou_em, d.pct_semana, coalesce(d.carimbos, 0) as carimbos, coalesce(d.semanas_seguidas, 0) as seguidas, d.pct_4sem
      from alunos a join contagem k on k.aluno_id = a.id left join ranking_desempate d on d.aluno_id = a.id
     where a.status = 'ativo' and k.n > 0 and (a.ranking_visivel or a.id = (select id from m))
  ),
  ordenado as (
    select b.*, rank() over (order by b.n desc, coalesce(b.pct_semana, -1) desc, b.carimbos desc, b.seguidas desc, coalesce(b.pct_4sem, -1) desc, b.chegou_em asc) as pos
      from base b
  )
  select case when auth.uid() is null or (public.aluno_id_atual() is null and not public.is_treinador()) or (select id from m) is null then null else
    jsonb_build_object(
      'posicao', (select o.pos from ordenado o where o.id = (select id from m)),
      'total', (select count(*) from ordenado),
      'trofeus', coalesce((select o.n from ordenado o where o.id = (select id from m)), 0),
      'carimbos', coalesce((select d.carimbos from ranking_desempate d where d.aluno_id = (select id from m)), 0),
      'semanas_seguidas', coalesce((select d.semanas_seguidas from ranking_desempate d where d.aluno_id = (select id from m)), 0),
      'recentes', coalesce((select jsonb_agg(x.codigo) from (select c.codigo, min(c.conquistado_em) as em from conquistas_aluno c where c.aluno_id = (select id from m) group by c.codigo order by 2 desc limit 3) x), '[]'::jsonb)
    ) end;
$$;
revoke all on function public.montinho_no_ranking() from public, anon;
grant execute on function public.montinho_no_ranking() to authenticated;
