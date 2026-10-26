-- Cole tudo no Supabase → SQL Editor do projeto app-montinho e clique em Run.
-- Aplica de uma vez as atualizações 0086, 0087, 0088, 0094, 0095 e 0096 (se algo falhar, nada fica gravado).
begin;

-- ===== 0086_strava =====
-- ============================================================================
-- 0086 — Strava: o aluno conecta a conta dele e, ao terminar o treino, o app
-- busca a atividade do relógio (batimento médio/máximo, duração, calorias).
-- • strava_conexoes: as chaves (tokens) da conexão. SÓ o próprio aluno lê,
--   grava e apaga (o personal nunca vê as chaves). Consentimento explícito
--   (dado de saúde, LGPD art. 11): consentido_em obrigatório.
-- • sessao_cardio: o resumo do relógio ligado ao treino. O aluno lê/grava
--   os dele; o personal lê de todos (acompanhamento). Uma linha por sessão.
-- Desconectar apaga a conexão; os resumos já importados ficam (são do treino).
-- ============================================================================
create table if not exists strava_conexoes (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  athlete_id bigint not null,
  atleta_nome text,
  access_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  escopo text,
  consentido_em timestamptz not null,
  conectado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table strava_conexoes enable row level security;
drop policy if exists strava_aluno on strava_conexoes;
create policy strava_aluno on strava_conexoes for all
  using (aluno_id = (select public.aluno_id_atual()))
  with check (aluno_id = (select public.aluno_id_atual()));

create table if not exists sessao_cardio (
  session_id uuid primary key references training_sessions(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  fonte text not null default 'strava' check (fonte in ('strava')),
  atividade_id bigint not null,
  nome_atividade text,
  dispositivo text,
  fc_media numeric(5,1),
  fc_max numeric(5,1),
  duracao_seg integer,
  calorias integer,
  inicio_atividade timestamptz,
  importado_em timestamptz not null default now()
);
create index if not exists sessao_cardio_aluno on sessao_cardio (aluno_id, inicio_atividade desc);
alter table sessao_cardio enable row level security;
drop policy if exists cardio_aluno on sessao_cardio;
create policy cardio_aluno on sessao_cardio for all
  using (aluno_id = (select public.aluno_id_atual()))
  with check (aluno_id = (select public.aluno_id_atual()) and exists (select 1 from training_sessions s where s.id = session_id and s.aluno_id = sessao_cardio.aluno_id));
drop policy if exists cardio_treinador_le on sessao_cardio;
create policy cardio_treinador_le on sessao_cardio for select using ((select public.is_treinador()));

insert into supabase_migrations.schema_migrations(version, name) values ('0086', 'strava') on conflict do nothing;

-- ===== 0087_strava_trofeu_cardios =====
-- ============================================================================
-- 0087 — Strava, parte 2 (pedido do Montinho em 24/10/2026):
-- • Troféu “Relógio no Pulso” (strava_conectado): conectar o Strava. A regra
--   fica no app (regras.ts); aqui o banco só passa a aceitar o código.
-- • cardios_strava: corridas, bikes, caminhadas… que o aluno registra no
--   Strava (fora do treino de musculação do app). O aluno lê/grava os dele;
--   o personal lê de todos. Não contam na meta semanal de musculação.
-- • strava_conexoes.cardios_sync_em: última busca de cardios (no máximo 1/h).
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado'));

alter table strava_conexoes add column if not exists cardios_sync_em timestamptz;

create table if not exists cardios_strava (
  atividade_id bigint primary key,
  aluno_id uuid not null references alunos(id) on delete cascade,
  tipo text not null,
  nome text,
  inicio timestamptz not null,
  duracao_seg integer not null check (duracao_seg >= 0),
  distancia_m integer,
  fc_media numeric(5,1),
  fc_max numeric(5,1),
  elevacao_m integer,
  importado_em timestamptz not null default now()
);
create index if not exists cardios_strava_aluno on cardios_strava (aluno_id, inicio desc);
alter table cardios_strava enable row level security;
drop policy if exists cardios_aluno on cardios_strava;
create policy cardios_aluno on cardios_strava for all
  using (aluno_id = (select public.aluno_id_atual()))
  with check (aluno_id = (select public.aluno_id_atual()));
drop policy if exists cardios_treinador_le on cardios_strava;
create policy cardios_treinador_le on cardios_strava for select using ((select public.is_treinador()));

insert into supabase_migrations.schema_migrations(version, name) values ('0087', 'strava_trofeu_cardios') on conflict do nothing;

-- ===== 0088_trofeus_compartilhar =====
-- ============================================================================
-- 0088 — Troféus de compartilhamento (aprovados pelo Montinho em 24/10/2026):
-- 📣 Espalhando o Chalalá, 📸 Diário de Bordo, 🏆 Vitrine de Troféus,
-- 🔥 Inspiração da Galera e 🤝 Trouxe um Amigo. As regras ficam no app
-- (src/lib/conquistas/compartilhar.ts); aqui o banco aceita os códigos e o
-- aluno lê só os PRÓPRIOS eventos de compartilhamento + as visitas ao link
-- dele (código opaco c:<12 hex> = md5(aluno_id || ':chalala'), sem revelar
-- quem visitou).
-- ============================================================================
alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido','treino_samurai','strava_conectado','compartilhou_primeiro','diario_de_bordo','vitrine_de_trofeus','inspiracao_galera','trouxe_amigo'));

create or replace function public.meus_eventos_compartilhar()
returns table (tipo text, origem text, modelo text, ref text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select e.tipo, e.origem, e.modelo, e.ref, e.created_at
    from eventos_chalala e
   where public.aluno_id_atual() is not null
     and e.aluno_id = public.aluno_id_atual()
     and e.tipo in ('compartilhar_nativo', 'download', 'descoberta_compartilhada')
  union all
  select e.tipo, null, null, e.ref, e.created_at
    from eventos_chalala e
   where public.aluno_id_atual() is not null
     and e.tipo = 'visita_link'
     and e.ref = 'c:' || substr(md5(public.aluno_id_atual()::text || ':chalala'), 1, 12)
  order by 5
  limit 2000
$$;
revoke all on function public.meus_eventos_compartilhar() from public, anon;
grant execute on function public.meus_eventos_compartilhar() to authenticated;

insert into supabase_migrations.schema_migrations(version, name) values ('0088', 'trofeus_compartilhar') on conflict do nothing;

-- ===== 0094_desafios_entre_alunos =====
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

insert into supabase_migrations.schema_migrations(version, name) values ('0094', 'desafios_entre_alunos') on conflict do nothing;

-- ===== 0095_desafios_notificacoes =====
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

insert into supabase_migrations.schema_migrations(version, name) values ('0095', 'desafios_notificacoes') on conflict do nothing;

-- ===== 0096_montinho_pulso =====
-- ============================================================================
-- 0096 — Montinho Pulso (check-in de bem-estar unificado) — ADITIVA
-- * check_ins (0003, 1 linha por aluno por dia) passa a guardar também as
--   respostas do Pulso: energia, corpo (recuperação), vontade de treinar, sono,
--   o que está dificultando, se pulou e a sessão de treino ligada. As réguas
--   antigas 1–10 continuam como estão (histórico preservado).
-- * pulso_preferencias: consentimento específico para dado de saúde (corpo e
--   sono — LGPD art. 11) e se o aluno compartilha as tendências com o personal.
-- * acompanhamento_alertas: o que o personal fez com cada alerta (acompanhado,
--   dispensado, adiado) para não repetir o mesmo alerta (cooldown).
-- * dados_saude_acessos: registro de quem abriu o histórico de bem-estar.
-- * intervencoes.tipo aceita 'contato' (contato registrado pelo personal).
-- RLS: o aluno lê/grava só o próprio; o personal lê; alertas e registro de
-- acesso só o personal. Nada vai para analytics, CRM ou leads.
-- ============================================================================

alter table check_ins add column if not exists origem text not null default 'diario';
alter table check_ins drop constraint if exists check_ins_origem_check;
alter table check_ins add constraint check_ins_origem_check check (origem in ('diario', 'pulso'));
alter table check_ins add column if not exists pulso_energia text
  check (pulso_energia is null or pulso_energia in ('muito_baixa','baixa','normal','alta','muito_alta'));
alter table check_ins add column if not exists pulso_recuperacao text
  check (pulso_recuperacao is null or pulso_recuperacao in ('bem','um_pouco_cansado','muito_cansado','desconforto'));
alter table check_ins add column if not exists pulso_motivacao text
  check (pulso_motivacao is null or pulso_motivacao in ('nenhuma','pouca','normal','muita'));
alter table check_ins add column if not exists pulso_sono text
  check (pulso_sono is null or pulso_sono in ('muito_mal','mal','razoavel','bem','muito_bem'));
alter table check_ins add column if not exists pulso_dificuldades text[]
  check (pulso_dificuldades is null or pulso_dificuldades <@ array['falta_tempo','cansaco','desmotivacao','exercicios','rotina_corrida','nada']::text[]);
alter table check_ins add column if not exists pulso_pulou boolean not null default false;
alter table check_ins add column if not exists sessao_id uuid references training_sessions(id) on delete set null;
alter table check_ins add column if not exists respondido_em timestamptz;
alter table check_ins drop constraint if exists check_ins_notas_tamanho;
alter table check_ins add constraint check_ins_notas_tamanho check (notas is null or length(notas) <= 300) not valid;

-- ---------------------------------------------------------------------------
create table if not exists pulso_preferencias (
  aluno_id uuid primary key references alunos(id) on delete cascade,
  consentimento_saude_em timestamptz,
  consentimento_revogado_em timestamptz,
  compartilhar_tendencias boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table pulso_preferencias enable row level security;
drop policy if exists pulso_pref_aluno on pulso_preferencias;
create policy pulso_pref_aluno on pulso_preferencias for all
  using (aluno_id = public.aluno_id_atual()) with check (aluno_id = public.aluno_id_atual());
drop policy if exists pulso_pref_treinador_le on pulso_preferencias;
create policy pulso_pref_treinador_le on pulso_preferencias for select using (public.is_treinador());

-- ---------------------------------------------------------------------------
create table if not exists acompanhamento_alertas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  origem text not null check (origem in ('pulso', 'aderencia')),
  -- Identifica o alerta (ex.: 'pulso:desconforto:2026-10-25'), sem dado de saúde em texto livre.
  chave text not null check (length(chave) between 3 and 120),
  estado text not null check (estado in ('acompanhado', 'dispensado', 'adiado')),
  adiado_ate date,
  nota text check (nota is null or length(nota) <= 500),
  autor_id uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (aluno_id, chave),
  check (estado <> 'adiado' or adiado_ate is not null)
);
create index if not exists idx_acomp_alertas_aluno on acompanhamento_alertas(aluno_id, updated_at desc);
alter table acompanhamento_alertas enable row level security;
drop policy if exists acomp_alertas_treinador on acompanhamento_alertas;
create policy acomp_alertas_treinador on acompanhamento_alertas for all using (public.is_treinador()) with check (public.is_treinador());

-- ---------------------------------------------------------------------------
create table if not exists dados_saude_acessos (
  id bigint generated always as identity primary key,
  leitor_id uuid not null references profiles(id) on delete cascade default auth.uid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  recurso text not null check (recurso in ('pulso_historico', 'pulso_painel')),
  created_at timestamptz not null default now()
);
create index if not exists idx_saude_acessos_aluno on dados_saude_acessos(aluno_id, created_at desc);
alter table dados_saude_acessos enable row level security;
drop policy if exists saude_acessos_treinador_le on dados_saude_acessos;
create policy saude_acessos_treinador_le on dados_saude_acessos for select using (public.is_treinador());
drop policy if exists saude_acessos_treinador_grava on dados_saude_acessos;
create policy saude_acessos_treinador_grava on dados_saude_acessos for insert with check (public.is_treinador() and leitor_id = auth.uid());

-- ---------------------------------------------------------------------------
alter table intervencoes drop constraint if exists intervencoes_tipo_check;
alter table intervencoes add constraint intervencoes_tipo_check
  check (tipo in ('nota','revisao_treino','ajuste_programa','mensagem','decisao','resposta_adaptacao','contato'));

-- ---------------------------------------------------------------------------
-- Guarda: a observação escrita do check-in some depois de 12 meses (as
-- escolhas ficam). Chamada pelo cron do app com a mesma chave dos lembretes.
create or replace function public.pulso_limpar_notas_antigas(p_chave text)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare n integer;
begin
  if not public.chave_agendador_ok(p_chave) then raise exception 'não autorizado'; end if;
  update check_ins set notas = null where notas is not null and data < (current_date - interval '12 months');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.pulso_limpar_notas_antigas(text) from public;
grant execute on function public.pulso_limpar_notas_antigas(text) to anon;

commit;
