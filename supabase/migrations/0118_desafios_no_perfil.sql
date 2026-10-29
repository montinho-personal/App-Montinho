-- ============================================================================
-- 0118 — Desafios no perfil do ranking (pedido do Montinho, 29/10/2026):
-- quantos desafios a pessoa criou, quantas vezes foi chamada, quantos aceitou,
-- quantos venceu e quantas metas cumpriu.
--   • desafio_resultados: o resultado de cada desafio JÁ ENCERRADO, gravado
--     pela conta do app (mesma regra do placar, src/lib/desafios/regras.ts)
--     só por salvar_resultados_desafio(), só para quem aceitou e só depois do fim.
--   • ranking_perfil(): a mesma de 0117 + o bloco `desafios`.
-- ADIÇÃO e idempotente.
-- ============================================================================
create table if not exists desafio_resultados (
  desafio_id uuid not null references desafios(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  venceu boolean not null default false,
  cumpriu boolean not null default false,
  registrado_em timestamptz not null default now(),
  primary key (desafio_id, aluno_id)
);
create index if not exists desafio_resultados_aluno on desafio_resultados (aluno_id);
alter table desafio_resultados enable row level security;
drop policy if exists desafio_res_treinador on desafio_resultados;
create policy desafio_res_treinador on desafio_resultados for select using ((select public.is_treinador()));
drop policy if exists desafio_res_proprio on desafio_resultados;
create policy desafio_res_proprio on desafio_resultados for select using (aluno_id = (select public.aluno_id_atual()));
-- Escrita só pela função abaixo.

-- p_resultados = [{"desafio": uuid, "venceu": bool, "cumpriu": bool}, …]
create or replace function public.salvar_resultados_desafio(p_resultados jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_eu uuid := public.aluno_id_atual(); v_hoje date := (now() at time zone 'America/Sao_Paulo')::date; n int := 0; r jsonb;
begin
  if v_eu is null or jsonb_typeof(p_resultados) <> 'array' then return 0; end if;
  for r in select * from jsonb_array_elements(p_resultados) limit 60 loop
    insert into desafio_resultados (desafio_id, aluno_id, venceu, cumpriu)
    select d.id, v_eu, coalesce((r->>'venceu')::boolean, false), coalesce((r->>'cumpriu')::boolean, false)
      from desafios d join desafio_participantes p on p.desafio_id = d.id and p.aluno_id = v_eu and p.status = 'aceito'
     where d.id = (r->>'desafio')::uuid and d.fim < v_hoje and d.cancelado_em is null
    on conflict (desafio_id, aluno_id) do update set venceu = excluded.venceu, cumpriu = excluded.cumpriu, registrado_em = now();
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;
revoke all on function public.salvar_resultados_desafio(jsonb) from public, anon;
grant execute on function public.salvar_resultados_desafio(jsonb) to authenticated;

create or replace function public.ranking_perfil(p_aluno uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_tr boolean := public.is_treinador(); v_eu uuid := public.aluno_id_atual(); v jsonb; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
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
    'cutuquei_hoje', exists (select 1 from ranking_cutucadas r where r.de_aluno_id = v_eu and r.para_aluno_id = a.id and r.dia = (now() at time zone 'America/Sao_Paulo')::date),
    'desafios', jsonb_build_object(
      'criados', (select count(*) from desafios x where x.criador_aluno_id = a.id and x.cancelado_em is null),
      'chamado', (select count(*) from desafio_participantes x join desafios y on y.id = x.desafio_id where x.aluno_id = a.id and y.cancelado_em is null and coalesce(x.convidado_por, y.criador_aluno_id) <> a.id),
      'aceitos', (select count(*) from desafio_participantes x join desafios y on y.id = x.desafio_id where x.aluno_id = a.id and x.status = 'aceito' and y.cancelado_em is null),
      'em_andamento', (select count(*) from desafio_participantes x join desafios y on y.id = x.desafio_id where x.aluno_id = a.id and x.status = 'aceito' and y.cancelado_em is null and y.fim >= v_hoje),
      'chamou', (select count(distinct x.aluno_id) from desafio_participantes x join desafios y on y.id = x.desafio_id where x.convidado_por = a.id and x.aluno_id <> a.id and y.cancelado_em is null),
      'vitorias', (select count(*) from desafio_resultados x where x.aluno_id = a.id and x.venceu),
      'metas', (select count(*) from desafio_resultados x where x.aluno_id = a.id and x.cumpriu)
    )
  ) into v
  from alunos a left join profiles p on p.id = a.profile_id left join ranking_desempate d on d.aluno_id = a.id
  where a.id = p_aluno;
  return v;
end $$;
revoke all on function public.ranking_perfil(uuid) from public, anon;
grant execute on function public.ranking_perfil(uuid) to authenticated;
