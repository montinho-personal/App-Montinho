-- ============================================================================
-- 0094 — Desafios entre alunos (pedido do Montinho, 24/10/2026)
-- • Qualquer aluno ou visitante cria um desafio (sem aprovação do personal)
--   e convida outros pelo nome (quem aparece no ranking) ou por link
--   (/desafio/<codigo>). Quem não tem conta entra pelo convite DESAFIO
--   (visitante, 30 dias) e depois aceita o desafio.
-- • Tipos (só o que o app mede sozinho; regras em src/lib/desafios/regras.ts):
--   mais_treinos, corrida (primeiro a N), meta_fixa, semanas, madrugador,
--   volume (kg × repetições), evolucao (vs. as 4 semanas antes), recordes,
--   musculo (séries de um grupo), dupla (time soma treinos), treino_desafio
--   (os mesmos exercícios para todos). Conta treino concluído com séries.
-- • Cutucar (desafio_cutucadas): provocação com emoji no placar, 1 por dia
--   para a mesma pessoa no mesmo desafio.
--   O placar é calculado no app (src/lib/desafios/regras.ts) com os dados de
--   dados_desafio(): só participantes (e o personal) leem.
-- • Troféus: criador_desafios, campeao_desafio, palavra_cumprida, desafiante_nato.
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo','criador_desafios','campeao_desafio','palavra_cumprida','desafiante_nato'));

create table if not exists desafios (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9]{6}$'),
  criador_aluno_id uuid not null references alunos(id) on delete cascade,
  nome text not null check (char_length(nome) between 3 and 60),
  tipo text not null check (tipo in ('mais_treinos', 'corrida', 'meta_fixa', 'semanas', 'madrugador', 'volume', 'evolucao', 'recordes', 'musculo', 'dupla', 'treino_desafio')),
  meta int check (meta is null or meta between 1 and 200),
  foco text check (foco is null or foco in ('pernas', 'gluteo', 'bracos', 'peito', 'costas', 'ombros', 'abdomen')),
  exercicios jsonb check (exercicios is null or (jsonb_typeof(exercicios) = 'array' and jsonb_array_length(exercicios) between 1 and 10)),
  modelo text check (modelo is null or modelo ~ '^[a-z0-9_]{1,40}$'),
  revanche_de uuid references desafios(id) on delete set null,
  inicio date not null,
  fim date not null,
  cancelado_em timestamptz,
  created_at timestamptz not null default now(),
  check (fim >= inicio and fim - inicio <= 62),
  check (tipo not in ('meta_fixa', 'semanas', 'corrida', 'dupla') or meta is not null),
  check (tipo <> 'musculo' or foco is not null),
  check (tipo <> 'treino_desafio' or exercicios is not null)
);
create index if not exists idx_desafios_criador on desafios(criador_aluno_id);

create table if not exists desafio_participantes (
  desafio_id uuid not null references desafios(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  status text not null default 'convidado' check (status in ('convidado', 'aceito', 'recusado')),
  convidado_por uuid references alunos(id) on delete set null,
  created_at timestamptz not null default now(),
  respondido_em timestamptz,
  primary key (desafio_id, aluno_id)
);
create index if not exists idx_desafio_part_aluno on desafio_participantes(aluno_id);

alter table desafios enable row level security;
alter table desafio_participantes enable row level security;

-- Participa (convidado, aceito ou recusado) do desafio?
create or replace function public.participa_do_desafio(p_desafio uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from desafio_participantes where desafio_id = p_desafio and aluno_id = public.aluno_id_atual());
$$;
revoke all on function public.participa_do_desafio(uuid) from public, anon;
grant execute on function public.participa_do_desafio(uuid) to authenticated;

drop policy if exists desafios_le on desafios;
create policy desafios_le on desafios for select using (public.is_treinador() or criador_aluno_id = public.aluno_id_atual() or public.participa_do_desafio(id));
drop policy if exists desafios_cria on desafios;
create policy desafios_cria on desafios for insert with check (criador_aluno_id = public.aluno_id_atual());
drop policy if exists desafios_cancela on desafios;
create policy desafios_cancela on desafios for update using (criador_aluno_id = public.aluno_id_atual()) with check (criador_aluno_id = public.aluno_id_atual());

drop policy if exists desafio_part_le on desafio_participantes;
create policy desafio_part_le on desafio_participantes for select using (public.is_treinador() or aluno_id = public.aluno_id_atual() or public.participa_do_desafio(desafio_id));
-- Escritas só pelas funções abaixo (security definer).

-- Criador entra aceito ao criar.
create or replace function public.desafio_criador_entra()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into desafio_participantes (desafio_id, aluno_id, status, respondido_em) values (new.id, new.criador_aluno_id, 'aceito', now())
  on conflict do nothing;
  return new;
end $$;
revoke all on function public.desafio_criador_entra() from public, anon, authenticated;
drop trigger if exists trg_desafio_criador on desafios;
create trigger trg_desafio_criador after insert on desafios for each row execute function public.desafio_criador_entra();

-- Convidar pelo nome: quem já aceitou convida (até 30 pessoas por desafio).
create or replace function public.convidar_para_desafio(p_desafio uuid, p_alunos uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare v_eu uuid := public.aluno_id_atual(); v_n int;
begin
  if v_eu is null or not exists (select 1 from desafio_participantes where desafio_id = p_desafio and aluno_id = v_eu and status = 'aceito') then
    raise exception 'Só quem participa pode convidar';
  end if;
  if exists (select 1 from desafios where id = p_desafio and (cancelado_em is not null or fim < (now() at time zone 'America/Sao_Paulo')::date)) then
    raise exception 'Desafio encerrado';
  end if;
  insert into desafio_participantes (desafio_id, aluno_id, status, convidado_por)
  select p_desafio, a.id, 'convidado', v_eu from alunos a
   where a.id = any(p_alunos) and a.id <> v_eu and a.status <> 'arquivado'
     and (select count(*) from desafio_participantes where desafio_id = p_desafio) < 30
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.convidar_para_desafio(uuid, uuid[]) from public, anon;
grant execute on function public.convidar_para_desafio(uuid, uuid[]) to authenticated;

-- Aceitar/recusar um convite recebido.
create or replace function public.responder_desafio(p_desafio uuid, p_aceitar boolean)
returns void language sql security definer set search_path = public as $$
  update desafio_participantes set status = case when p_aceitar then 'aceito' else 'recusado' end, respondido_em = now()
   where desafio_id = p_desafio and aluno_id = public.aluno_id_atual() and status <> 'aceito';
$$;
revoke all on function public.responder_desafio(uuid, boolean) from public, anon;
grant execute on function public.responder_desafio(uuid, boolean) to authenticated;

-- Entrar pelo link (código). Devolve o id do desafio.
create or replace function public.entrar_no_desafio(p_codigo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_eu uuid := public.aluno_id_atual(); v_id uuid;
begin
  if v_eu is null then raise exception 'Entre na sua conta'; end if;
  select id into v_id from desafios where codigo = upper(p_codigo) and cancelado_em is null and fim >= (now() at time zone 'America/Sao_Paulo')::date;
  if v_id is null then raise exception 'Desafio não encontrado ou já encerrado'; end if;
  if (select count(*) from desafio_participantes where desafio_id = v_id) >= 30 and not exists (select 1 from desafio_participantes where desafio_id = v_id and aluno_id = v_eu) then
    raise exception 'Este desafio já está cheio';
  end if;
  insert into desafio_participantes (desafio_id, aluno_id, status, respondido_em) values (v_id, v_eu, 'aceito', now())
  on conflict (desafio_id, aluno_id) do update set status = 'aceito', respondido_em = now();
  return v_id;
end $$;
revoke all on function public.entrar_no_desafio(text) from public, anon;
grant execute on function public.entrar_no_desafio(text) to authenticated;

-- Prévia pública do link (sem login): nome, tipo, datas, primeiro nome de quem criou e quantos aceitaram.
create or replace function public.desafio_publico(p_codigo text)
returns table (nome text, tipo text, meta int, inicio date, fim date, criador text, participantes int, encerrado boolean)
language sql stable security definer set search_path = public as $$
  select d.nome, d.tipo, d.meta, d.inicio, d.fim, split_part(coalesce(p.nome, ''), ' ', 1),
         (select count(*)::int from desafio_participantes x where x.desafio_id = d.id and x.status = 'aceito'),
         d.cancelado_em is not null or d.fim < (now() at time zone 'America/Sao_Paulo')::date
    from desafios d join alunos a on a.id = d.criador_aluno_id left join profiles p on p.id = a.profile_id
   where d.codigo = upper(p_codigo);
$$;
revoke all on function public.desafio_publico(text) from public;
grant execute on function public.desafio_publico(text) to anon, authenticated;

-- Primeiro nome + inicial do último sobrenome (“Aline de Souza” → “Aline S.”).
create or replace function public.nome_curto(p_nome text)
returns text language sql immutable set search_path = public as $$
  select case when coalesce(trim(p_nome), '') = '' then 'Aluno'
              when array_length(regexp_split_to_array(trim(p_nome), '\s+'), 1) = 1 then trim(p_nome)
              else (regexp_split_to_array(trim(p_nome), '\s+'))[1] || ' ' || upper(left((regexp_split_to_array(trim(p_nome), '\s+'))[array_length(regexp_split_to_array(trim(p_nome), '\s+'), 1)], 1)) || '.' end;
$$;

-- Pessoas para convidar pelo nome: quem aparece no ranking (primeiro nome + inicial).
create or replace function public.pessoas_para_desafio()
returns table (aluno_id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select a.id, public.nome_curto(p.nome)
    from alunos a join profiles p on p.id = a.profile_id
   where public.aluno_id_atual() is not null and a.id <> public.aluno_id_atual()
     and a.status = 'ativo' and coalesce(a.ranking_visivel, true)
   order by 2;
$$;
revoke all on function public.pessoas_para_desafio() from public, anon;
grant execute on function public.pessoas_para_desafio() to authenticated;

-- Dados do placar: para cada participante, os inícios dos treinos concluídos
-- com séries no período, as séries (carga, repetições, exercício, grupo) nos
-- tipos de peso/músculo — com as 4 semanas antes, para a evolução — e as
-- datas dos recordes. Só participantes e o personal; nome curto para alunos.
create or replace function public.dados_desafio(p_desafio uuid)
returns table (aluno_id uuid, nome text, status text, eu boolean, criador boolean, treinos timestamptz[], series jsonb, recordes timestamptz[])
language sql stable security definer set search_path = public as $$
  with d as (
    select x.*, (x.inicio::timestamp at time zone 'America/Sao_Paulo') as ini_ts, ((x.fim + 1)::timestamp at time zone 'America/Sao_Paulo') as fim_ts,
           ((x.inicio - case when x.tipo = 'evolucao' then 28 else 0 end)::timestamp at time zone 'America/Sao_Paulo') as base_ts
      from desafios x where x.id = p_desafio and (public.is_treinador() or public.participa_do_desafio(x.id))
  )
  select dp.aluno_id,
         case when public.is_treinador() then coalesce(p.nome, 'Aluno') else public.nome_curto(p.nome) end,
         dp.status, dp.aluno_id = public.aluno_id_atual(), dp.aluno_id = d.criador_aluno_id,
         coalesce((select array_agg(s.iniciado_em order by s.iniciado_em) from training_sessions s
                    where s.aluno_id = dp.aluno_id and s.status = 'concluida' and s.series_concluidas > 0
                      and s.iniciado_em >= d.ini_ts and s.iniciado_em < d.fim_ts), '{}'),
         case when d.tipo in ('volume', 'evolucao', 'musculo', 'treino_desafio') then
           coalesce((select jsonb_agg(jsonb_build_object('em', s.iniciado_em, 'b', se.biblioteca_id, 'g', se.grupo_muscular, 'c', ss.carga_kg, 'r', ss.reps))
                       from training_sessions s join session_exercises se on se.session_id = s.id join session_sets ss on ss.session_exercise_id = se.id
                      where s.aluno_id = dp.aluno_id and s.status = 'concluida'
                        and s.iniciado_em >= d.base_ts and s.iniciado_em < d.fim_ts
                        and ss.tipo in ('valida', 'dropset', 'rest_pause', 'cluster')), '[]'::jsonb)
         else '[]'::jsonb end,
         case when d.tipo = 'recordes' then
           coalesce((select array_agg(c.conquistado_em) from conquistas_aluno c
                      where c.aluno_id = dp.aluno_id and c.codigo = 'recorde' and c.conquistado_em >= d.ini_ts and c.conquistado_em < d.fim_ts), '{}')
         else '{}'::timestamptz[] end
    from d join desafio_participantes dp on dp.desafio_id = d.id
    join alunos a on a.id = dp.aluno_id left join profiles p on p.id = a.profile_id;
$$;
revoke all on function public.dados_desafio(uuid) from public, anon;
grant execute on function public.dados_desafio(uuid) to authenticated;

-- Cutucar: provocação com emoji no placar (só entre quem aceitou; 1 por dia por pessoa e desafio).
create table if not exists desafio_cutucadas (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references desafios(id) on delete cascade,
  de_aluno_id uuid not null references alunos(id) on delete cascade,
  para_aluno_id uuid not null references alunos(id) on delete cascade,
  emoji text not null check (emoji in ('🔥', '💪', '😈', '⏰', '👀')),
  dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at timestamptz not null default now(),
  vista_em timestamptz,
  unique (desafio_id, de_aluno_id, para_aluno_id, dia)
);
create index if not exists idx_cutucadas_para on desafio_cutucadas(para_aluno_id, created_at desc);
alter table desafio_cutucadas enable row level security;
drop policy if exists cutucadas_le on desafio_cutucadas;
create policy cutucadas_le on desafio_cutucadas for select using (public.is_treinador() or de_aluno_id = public.aluno_id_atual() or para_aluno_id = public.aluno_id_atual());
drop policy if exists cutucadas_vista on desafio_cutucadas;
create policy cutucadas_vista on desafio_cutucadas for update using (para_aluno_id = public.aluno_id_atual()) with check (para_aluno_id = public.aluno_id_atual());

create or replace function public.cutucar_no_desafio(p_desafio uuid, p_para uuid, p_emoji text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_eu uuid := public.aluno_id_atual();
begin
  if v_eu is null or v_eu = p_para then return false; end if;
  if not exists (select 1 from desafio_participantes where desafio_id = p_desafio and aluno_id = v_eu and status = 'aceito')
     or not exists (select 1 from desafio_participantes where desafio_id = p_desafio and aluno_id = p_para and status = 'aceito') then
    raise exception 'Só entre quem está no desafio';
  end if;
  insert into desafio_cutucadas (desafio_id, de_aluno_id, para_aluno_id, emoji) values (p_desafio, v_eu, p_para, p_emoji)
  on conflict (desafio_id, de_aluno_id, para_aluno_id, dia) do nothing;
  return found;
end $$;
revoke all on function public.cutucar_no_desafio(uuid, uuid, text) from public, anon;
grant execute on function public.cutucar_no_desafio(uuid, uuid, text) to authenticated;

-- Cutucadas recebidas e ainda não vistas (com o primeiro nome de quem cutucou).
create or replace function public.minhas_cutucadas()
returns table (id uuid, desafio_id uuid, desafio text, de text, emoji text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.desafio_id, d.nome, public.nome_curto(p.nome), c.emoji, c.created_at
    from desafio_cutucadas c join desafios d on d.id = c.desafio_id
    join alunos a on a.id = c.de_aluno_id left join profiles p on p.id = a.profile_id
   where c.para_aluno_id = public.aluno_id_atual() and c.vista_em is null
   order by c.created_at desc limit 10;
$$;
revoke all on function public.minhas_cutucadas() from public, anon;
grant execute on function public.minhas_cutucadas() to authenticated;

-- Convite para quem ainda não tem conta (visitante, 30 dias).
insert into convites (codigo, tipo_acesso, dias, origem, ativo)
values ('DESAFIO', 'dias', 30, 'desafio entre alunos', true)
on conflict (codigo) do nothing;
