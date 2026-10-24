-- ============================================================================
-- 0094 — Desafios entre alunos (pedido do Montinho, 24/10/2026)
-- • Qualquer aluno ou visitante cria um desafio (sem aprovação do personal)
--   e convida outros pelo nome (quem aparece no ranking) ou por link
--   (/desafio/<codigo>). Quem não tem conta entra pelo convite DESAFIO
--   (visitante, 30 dias) e depois aceita o desafio.
-- • Tipos (só o que o app mede sozinho): mais_treinos, meta_fixa (N treinos),
--   semanas (N treinos por semana em todas as semanas), madrugador (treinos
--   começados antes das 6h). Conta treino concluído com séries, 1 por dia.
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
  tipo text not null check (tipo in ('mais_treinos', 'meta_fixa', 'semanas', 'madrugador')),
  meta int check (meta is null or meta between 1 and 60),
  inicio date not null,
  fim date not null,
  cancelado_em timestamptz,
  created_at timestamptz not null default now(),
  check (fim >= inicio and fim - inicio <= 62),
  check (tipo not in ('meta_fixa', 'semanas') or meta is not null)
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
-- com séries dentro do período (o app conta 1 por dia, horário de Brasília).
-- Só participantes e o personal; nome curto para alunos, completo para o personal.
create or replace function public.dados_desafio(p_desafio uuid)
returns table (aluno_id uuid, nome text, status text, eu boolean, criador boolean, treinos timestamptz[])
language sql stable security definer set search_path = public as $$
  select dp.aluno_id,
         case when public.is_treinador() then coalesce(p.nome, 'Aluno')
              else public.nome_curto(p.nome) end,
         dp.status, dp.aluno_id = public.aluno_id_atual(), dp.aluno_id = d.criador_aluno_id,
         coalesce((select array_agg(s.iniciado_em order by s.iniciado_em) from training_sessions s
                    where s.aluno_id = dp.aluno_id and s.status = 'concluida' and s.series_concluidas > 0
                      and s.iniciado_em >= (d.inicio::timestamp at time zone 'America/Sao_Paulo')
                      and s.iniciado_em < ((d.fim + 1)::timestamp at time zone 'America/Sao_Paulo')), '{}')
    from desafios d join desafio_participantes dp on dp.desafio_id = d.id
    join alunos a on a.id = dp.aluno_id left join profiles p on p.id = a.profile_id
   where d.id = p_desafio and (public.is_treinador() or public.participa_do_desafio(d.id));
$$;
revoke all on function public.dados_desafio(uuid) from public, anon;
grant execute on function public.dados_desafio(uuid) to authenticated;

-- Convite para quem ainda não tem conta (visitante, 30 dias).
insert into convites (codigo, tipo_acesso, dias, origem, ativo)
values ('DESAFIO', 'dias', 30, 'desafio entre alunos', true)
on conflict (codigo) do nothing;
