-- ============================================================================
-- Testes de autorização (RLS) e da migração do logbook legado.
-- Roda no Postgres local (scripts/db-local-test.sh). Cada bloco levanta
-- exceção se a expectativa falhar; a saída "TODOS OS TESTES PASSARAM" é a prova.
-- ============================================================================
\set ON_ERROR_STOP on
\set QUIET on

-- Helpers para "logar" como alguém (simula o JWT do Supabase)
create or replace function test_login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('role', 'authenticated', false);
end $$;
create or replace function test_logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', false);
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

-- ---------------------------------------------------------------------------
-- T1. Migração do logbook legado
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from training_sessions where origem = 'legado_logbook';
  if n <> 3 then raise exception 'T1a: esperava 3 sessões legadas (A 05-01, A 05-03, B 05-02), obteve %', n; end if;
  select count(*) into n from session_sets;
  if n <> 6 then raise exception 'T1b: esperava 6 séries migradas, obteve %', n; end if;
  select count(*) into n from logbook where session_set_id is null;
  if n <> 0 then raise exception 'T1c: % linhas do logbook ficaram sem migrar', n; end if;
  select series_concluidas into n from training_sessions where client_key like 'legado:aaaaaaaa%2026-05-01%';
  if n <> 4 then raise exception 'T1d: sessão de 05-01 deveria ter 4 séries válidas (inclui duplicata preservada), obteve %', n; end if;
  raise notice 'T1 OK: logbook legado migrado sem perda';
end $$;

-- ---------------------------------------------------------------------------
-- T2. Aluno A só vê os próprios dados
-- ---------------------------------------------------------------------------
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int;
begin
  select count(*) into n from treinos;
  if n <> 1 then raise exception 'T2a: aluno A deveria ver 1 treino, viu %', n; end if;
  select count(*) into n from treinos where aluno_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if n <> 0 then raise exception 'T2b: aluno A viu treino do aluno B'; end if;
  select count(*) into n from training_sessions;
  if n <> 2 then raise exception 'T2c: aluno A deveria ver 2 sessões, viu %', n; end if;
  select count(*) into n from session_sets;
  if n <> 5 then raise exception 'T2d: aluno A deveria ver 5 séries, viu %', n; end if;
  select count(*) into n from exercicios where treino_id = 'cccccccc-cccc-cccc-cccc-ccccccccccc2';
  if n <> 0 then raise exception 'T2e: aluno A viu exercícios do aluno B'; end if;
  select count(*) into n from storage.objects where name like 'bbbbbbbb%';
  if n <> 0 then raise exception 'T2f: aluno A viu foto do aluno B no storage'; end if;
  select count(*) into n from storage.objects where name like 'aaaaaaaa%';
  if n <> 1 then raise exception 'T2g: aluno A deveria ver a própria foto'; end if;
  raise notice 'T2 OK: isolamento de leitura entre alunos';
end $$;

-- ---------------------------------------------------------------------------
-- T3. Aluno A não escreve em nome do aluno B nem em tabelas administrativas
-- ---------------------------------------------------------------------------
do $$
declare ok boolean := false; n int;
begin
  begin
    insert into training_sessions (aluno_id, client_key) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ataque-1');
  exception when insufficient_privilege or others then ok := true; end;
  if not ok then raise exception 'T3a: aluno A criou sessão para o aluno B'; end if;

  ok := false;
  begin
    insert into templates_treino (nome, estrutura) values ('hack', '{}'::jsonb);
  exception when others then ok := true; end;
  if not ok then raise exception 'T3b: aluno criou template'; end if;

  ok := false;
  begin
    insert into logbook (aluno_id, exercicio_id, data, serie, reps) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','dddddddd-dddd-dddd-dddd-dddddddddddd', current_date, 1, 10);
  exception when others then ok := true; end;
  if not ok then raise exception 'T3c: aluno ainda escreve no logbook legado'; end if;

  ok := false;
  begin
    insert into biblioteca_programas (hash_estrutura, nome, estrutura) values ('h','x','{}'::jsonb);
  exception when others then ok := true; end;
  if not ok then raise exception 'T3d: aluno escreveu na memória de prescrições'; end if;

  select count(*) into n from biblioteca_programas;
  if n <> 0 then raise exception 'T3e: aluno leu a memória de prescrições'; end if;

  -- update em treino alheio não afeta linhas (RLS filtra silenciosamente)
  update treinos set nome = 'hackeado' where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc2';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T3f: aluno A alterou treino do aluno B'; end if;
  update treinos set nome = 'hackeado' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T3g: aluno alterou o próprio plano prescrito'; end if;

  delete from programa_versoes;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T3h: aluno apagou versões'; end if;
  raise notice 'T3 OK: escrita bloqueada fora do escopo do aluno';
end $$;

-- ---------------------------------------------------------------------------
-- T4. Aluno A registra sessão própria com idempotência
-- ---------------------------------------------------------------------------
do $$
declare sid uuid; seid uuid; n int; ok boolean := false;
begin
  insert into training_sessions (aluno_id, treino_id, client_key, letra, nome_treino)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','dev-1:sessao-1','A','Treino A')
  returning id into sid;
  insert into session_exercises (session_id, exercicio_id, client_key, ordem, nome, series_planejadas)
  values (sid, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'ex-1', 0, 'Supino reto', 3) returning id into seid;
  insert into session_sets (session_id, session_exercise_id, client_key, serie, carga_kg, reps)
  values (sid, seid, 'set-1', 1, 30, 10);
  -- reenvio da mesma série (rede instável): deve ser rejeitado pelo UNIQUE, não duplicado
  begin
    insert into session_sets (session_id, session_exercise_id, client_key, serie, carga_kg, reps)
    values (sid, seid, 'set-1', 1, 30, 10);
  exception when unique_violation then ok := true; end;
  if not ok then raise exception 'T4a: reenvio duplicou série'; end if;
  -- mesmo exercício duas vezes no mesmo dia: segunda sessão com outro client_key é permitida
  insert into training_sessions (aluno_id, treino_id, client_key, letra, nome_treino)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','dev-1:sessao-2','A','Treino A');
  select count(*) into n from training_sessions where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and status = 'em_andamento';
  if n <> 2 then raise exception 'T4b: esperava 2 sessões em andamento, obteve %', n; end if;
  update training_sessions set status = 'concluida', finalizado_em = now() where id = sid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'T4c: aluno não conseguiu finalizar a própria sessão'; end if;
  raise notice 'T4 OK: sessão própria idempotente';
end $$;

-- ---------------------------------------------------------------------------
-- T5. Aluno B não enxerga nem altera a sessão nova de A
-- ---------------------------------------------------------------------------
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from training_sessions where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if n <> 0 then raise exception 'T5a: aluno B viu sessões de A'; end if;
  select count(*) into n from session_sets where client_key = 'set-1';
  if n <> 0 then raise exception 'T5b: aluno B viu séries de A'; end if;
  update training_sessions set feedback_comentario = 'x' where client_key = 'dev-1:sessao-1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T5c: aluno B alterou sessão de A'; end if;
  select count(*) into n from adaptacoes;
  if n <> 0 then raise exception 'T5d: adaptações vazaram'; end if;
  raise notice 'T5 OK: aluno B isolado de A';
end $$;

-- ---------------------------------------------------------------------------
-- T6. Treinador vê tudo, cria versão e memória; versão é imutável
-- ---------------------------------------------------------------------------
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare n int; vid uuid;
begin
  select count(*) into n from training_sessions;
  if n < 5 then raise exception 'T6a: treinador deveria ver todas as sessões, viu %', n; end if;
  insert into programa_versoes (aluno_id, versao, autor_id, snapshot)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '11111111-1111-1111-1111-111111111111', '{"treinos":[]}'::jsonb)
  returning id into vid;
  update programa_versoes set motivo = 'tentativa' where id = vid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T6b: versão deveria ser imutável (sem policy de update)'; end if;
  insert into biblioteca_programas (hash_estrutura, nome, estrutura, metadados)
  values ('hash-1', 'Upper/Lower 4 dias', '{"treinos":[]}'::jsonb, '{"dias":4}'::jsonb);
  select count(*) into n from biblioteca_programas;
  if n <> 1 then raise exception 'T6c: treinador não leu a memória'; end if;
  raise notice 'T6 OK: treinador autorizado, versões imutáveis';
end $$;

select test_logout();

-- ---------------------------------------------------------------------------
-- T7. Biblioteca inteligente: catálogo, favoritos, equivalências e prescrições
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values ('44444444-4444-4444-4444-444444444444', 'outro.treinador@exemplo.local') on conflict do nothing;
update profiles set role = 'treinador' where id = '44444444-4444-4444-4444-444444444444';

create temp table _antes as select md5(string_agg(e::text, '|' order by e.id)) as h from exercicios e;
grant select on _antes to authenticated;

do $$
declare n int;
begin
  select count(*) into n from exercicios_biblioteca where origem = 'catalogo';
  if n <> 150 then raise exception 'T7a: esperava 150 exercícios do catálogo, obteve %', n; end if;
  select count(*) into n from exercicio_equivalencias where status = 'sugerida';
  if n < 300 then raise exception 'T7a: equivalências sugeridas ausentes (%)', n; end if;
  select count(*) into n from (select nome_normalizado from exercicios_biblioteca group by 1 having count(*) > 1) d;
  if n <> 0 then raise exception 'T7a: % nome(s) duplicado(s) na biblioteca', n; end if;
end $$;

-- Reaplicar o catálogo é idempotente e não toca em prescrições.
begin;
\ir ../../supabase/migrations/0013_catalogo_exercicios_v1.sql
commit;
do $$
declare n int; h_atual text;
begin
  select count(*) into n from exercicios_biblioteca;
  if n <> 150 then raise exception 'T7b: reaplicar o catálogo duplicou itens (%)', n; end if;
  select md5(string_agg(e::text, '|' order by e.id)) into h_atual from exercicios e;
  if h_atual is distinct from (select a.h from _antes a) then raise exception 'T7b: o catálogo alterou prescrições existentes'; end if;
end $$;

-- Aluno: lê a biblioteca (para executar), mas não escreve nem vê favoritos/equivalências.
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean;
begin
  select count(*) into n from exercicios_biblioteca;
  if n <> 150 then raise exception 'T7c: aluno deveria ler a biblioteca (viu %)', n; end if;
  select count(*) into n from exercicio_equivalencias;
  if n <> 0 then raise exception 'T7c: aluno não pode ler equivalências (viu %)', n; end if;
  ok := false;
  begin
    insert into exercicio_favoritos (treinador_id, exercicio_id)
    select '22222222-2222-2222-2222-222222222222', id from exercicios_biblioteca limit 1;
  exception when insufficient_privilege or others then ok := true; end;
  if not ok then raise exception 'T7c: aluno conseguiu criar favorito'; end if;
  update exercicios_biblioteca set nome = 'hack' where slug = 'supino-reto-barra';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T7c: aluno alterou a biblioteca'; end if;
  ok := false;
  begin
    update exercicio_equivalencias set status = 'aprovada';
    get diagnostics n = row_count;
    if n = 0 then ok := true; end if;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T7c: aluno revisou equivalência'; end if;
end $$;

-- Treinador 1: favorita e aprova uma equivalência.
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare n int;
begin
  insert into exercicio_favoritos (exercicio_id) select id from exercicios_biblioteca where slug = 'hip-thrust-barra';
  select count(*) into n from exercicio_favoritos;
  if n <> 1 then raise exception 'T7d: treinador deveria ver o próprio favorito'; end if;
  update exercicio_equivalencias set status = 'aprovada'
  where exercicio_id = (select id from exercicios_biblioteca where slug = 'supino-reto-barra')
    and alternativa_id = (select id from exercicios_biblioteca where slug = 'supino-reto-halteres');
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'T7d: treinador não conseguiu aprovar a equivalência'; end if;
end $$;

-- Treinador 2: não vê nem usa o favorito do treinador 1.
select test_login('44444444-4444-4444-4444-444444444444');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from exercicio_favoritos;
  if n <> 0 then raise exception 'T7e: treinador viu favoritos de outro (%)', n; end if;
  begin
    insert into exercicio_favoritos (treinador_id, exercicio_id)
    select '11111111-1111-1111-1111-111111111111', id from exercicios_biblioteca where slug = 'face-pull';
  exception when others then ok := true; end;
  if not ok then raise exception 'T7e: treinador gravou favorito em nome de outro'; end if;
  raise notice 'T7 OK: catálogo (150) idempotente, prescrições intactas, favoritos por treinador, aluno sem escrita';
end $$;

select test_logout();

-- ============================================================================
-- T8 — 0014: técnicas avançadas (myo-reps, drops/mini-séries) sem mexer no histórico
-- ============================================================================
do $$
declare ex_id uuid; ok boolean := false; n int;
begin
  select id into ex_id from exercicios limit 1;
  if ex_id is null then raise exception 'T8: sem exercício para testar'; end if;
  select count(*) into n from exercicios where tecnica_extras is not null or tecnica_series is not null;
  if n <> 0 then raise exception 'T8: prescrições antigas ganharam valor de técnica (%)', n; end if;
  update exercicios set tecnica = 'myo_reps', tecnica_extras = 4, tecnica_series = 2 where id = ex_id;
  begin
    update exercicios set tecnica_extras = 99 where id = ex_id;
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'T8: aceitou 99 drops/mini-séries'; end if;
  ok := false;
  begin
    update exercicios set tecnica = 'inventada' where id = ex_id;
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'T8: aceitou técnica desconhecida'; end if;
  update exercicios set tecnica = 'normal', tecnica_extras = null, tecnica_series = null where id = ex_id;
  raise notice 'T8 OK: myo_reps aceito, limites de drops/mini-séries e técnica validados';
end $$;
-- ============================================================================
-- T9 — 0015: lembrete de treino em aberto (push)
-- ============================================================================
insert into config_privada (chave, valor)
values ('lembrete_chave_sha256', encode(extensions.digest('chave-teste', 'sha256'), 'hex'))
on conflict (chave) do update set valor = excluded.valor;
-- treino da aluna A parado há 40 min (deve lembrar) e do aluno B com série há 5 min (não deve)
insert into training_sessions (id, aluno_id, treino_id, client_key, letra, nome_treino, iniciado_em, series_planejadas)
values ('99999999-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 't9-a', 'A', 'Treino A', now() - interval '40 minutes', 10),
       ('99999999-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 't9-b', 'A', 'Treino A', now() - interval '40 minutes', 10);
insert into session_exercises (id, session_id, client_key, nome, ordem)
values ('99999999-0000-0000-0000-0000000000eb', '99999999-0000-0000-0000-00000000000b', 't9-ex', 'Supino', 0);
insert into session_sets (session_id, session_exercise_id, client_key, serie, concluida_em)
values ('99999999-0000-0000-0000-00000000000b', '99999999-0000-0000-0000-0000000000eb', 't9-set', 1, now() - interval '5 minutes');

select test_login('22222222-2222-2222-2222-222222222222');
select push_registrar('https://push.exemplo.com/aparelho-da-aluna-a-0001', 'p256dh-a', 'auth-a', 'teste');
select test_login('33333333-3333-3333-3333-333333333333');
select push_registrar('https://push.exemplo.com/aparelho-do-aluno-b-0001', 'p256dh-b', 'auth-b', 'teste');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from push_inscricoes;
  if n <> 1 then raise exception 'T9a: aluno B deveria ver só o próprio aparelho (viu %)', n; end if;
  begin
    insert into push_inscricoes (profile_id, endpoint, p256dh, auth) values ('22222222-2222-2222-2222-222222222222', 'https://push.exemplo.com/forjado-000000', 'x', 'y');
  exception when others then ok := true; end;
  if not ok then raise exception 'T9a: gravou inscrição direto na tabela (em nome de outro)'; end if;
  ok := false;
  begin perform * from lembretes_devidos('chave-teste', 30); exception when others then ok := true; end;
  if not ok then raise exception 'T9a: aluno conseguiu listar lembretes'; end if;
end $$;
select test_logout();
set role anon;
do $$
declare n int; ok boolean := false; sess uuid;
begin
  begin perform * from lembretes_devidos('chave-errada', 30); exception when others then ok := true; end;
  if not ok then raise exception 'T9b: chave errada foi aceita'; end if;
  select count(*), min(sessao_id::text)::uuid into n, sess from lembretes_devidos('chave-teste', 30);
  if n <> 1 or sess <> '99999999-0000-0000-0000-00000000000a' then raise exception 'T9b: esperava 1 lembrete (treino parado da aluna A), veio % (%)', n, sess; end if;
  select count(*) into n from lembretes_devidos('chave-teste', 30);
  if n <> 0 then raise exception 'T9b: lembrete repetido para o mesmo treino'; end if;
  perform push_desativar('chave-teste', 'https://push.exemplo.com/aparelho-da-aluna-a-0001');
end $$;
reset role;
do $$
begin
  if (select ativo from push_inscricoes where endpoint = 'https://push.exemplo.com/aparelho-da-aluna-a-0001') then
    raise exception 'T9c: inscrição recusada não foi desativada';
  end if;
  if (select lembrete_enviado_em from training_sessions where id = '99999999-0000-0000-0000-00000000000b') is not null then
    raise exception 'T9c: treino com série recente foi lembrado';
  end if;
  raise notice 'T9 OK: lembrete só para treino parado, 1 vez, só com a chave; aparelhos isolados por usuário';
end $$;
-- ============================================================================
-- T10 — 0016: tempos do treino (padrão do treinador isolado; colunas aditivas)
-- ============================================================================
select test_login('11111111-1111-1111-1111-111111111111');
insert into preferencias_treinador (profile_id, tempos) values ('11111111-1111-1111-1111-111111111111', '{"descansoEntreSeriesSeg": 75}');
select test_login('44444444-4444-4444-4444-444444444444');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from preferencias_treinador;
  if n <> 0 then raise exception 'T10: treinador 2 viu o padrão do treinador 1'; end if;
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  begin insert into preferencias_treinador (profile_id, tempos) values ('22222222-2222-2222-2222-222222222222', '{}'); exception when others then ok := true; end;
  if not ok then raise exception 'T10: aluno gravou preferências de treinador'; end if;
end $$;
select test_logout();
do $$
begin
  if exists (select 1 from exercicios where descanso_apos_seg is not null) then raise exception 'T10: prescrições antigas ganharam descanso após'; end if;
  begin update exercicios set descanso_apos_seg = 5000 where id = (select id from exercicios limit 1); raise exception 'T10: aceitou descanso de 5000 s'; exception when check_violation then null; end;
  raise notice 'T10 OK: padrão de tempos isolado por treinador, aluno sem escrita, limites validados';
end $$;
-- ============================================================================
-- T11 — 0017: check-in pré-treino, pausas e modo da sessão
-- ============================================================================
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  insert into training_sessions (aluno_id, treino_id, client_key, checkin_pre, tempo_estimado_seg)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 't11-ok', 'cansado', 3000);
  begin
    insert into training_sessions (aluno_id, client_key, checkin_pre) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 't11-x', 'animadissimo');
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'T11: aceitou check-in fora da lista'; end if;
  ok := false;
  begin
    insert into training_sessions (aluno_id, client_key, checkin_pre) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 't11-b', 'normal');
  exception when others then ok := true; end;
  if not ok then raise exception 'T11: aluno A criou sessão com check-in para B'; end if;
  if (select modo from training_sessions where client_key = 't11-ok') <> 'normal' then raise exception 'T11: modo padrão deveria ser normal'; end if;
  raise notice 'T11 OK: check-in pré-treino validado, isolado por aluno; modo padrão normal';
end $$;
select test_logout();
-- ============================================================================
-- T12 — 0018: meta semanal versionada e pausas (treinador escreve; aluno só lê o seu)
-- ============================================================================
select test_login('11111111-1111-1111-1111-111111111111');
insert into metas_semanais (aluno_id, meta, vigente_desde) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, '2026-10-01'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 4, '2026-10-01');
insert into pausas_aluno (aluno_id, inicio, fim, tipo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-10', '2026-10-17', 'ferias');
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from metas_semanais;
  if n <> 1 then raise exception 'T12: aluna A deveria ver só a própria meta (viu %)', n; end if;
  select count(*) into n from pausas_aluno;
  if n <> 1 then raise exception 'T12: aluna A deveria ver a própria pausa'; end if;
  begin insert into metas_semanais (aluno_id, meta, vigente_desde) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 7, '2026-10-20'); exception when others then ok := true; end;
  if not ok then raise exception 'T12: aluno alterou a própria meta'; end if;
  ok := false;
  begin insert into pausas_aluno (aluno_id, inicio, tipo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-20', 'ferias'); exception when others then ok := true; end;
  if not ok then raise exception 'T12: aluno criou pausa'; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from pausas_aluno;
  if n <> 0 then raise exception 'T12: aluno B viu pausa de A'; end if;
end $$;
select test_logout();
do $$
declare ok boolean := false;
begin
  begin insert into pausas_aluno (aluno_id, inicio, fim) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-20', '2026-10-01'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'T12: aceitou pausa terminando antes de começar'; end if;
  raise notice 'T12 OK: metas e pausas — treinador escreve, aluno lê só o seu, datas validadas';
end $$;
\echo 'TODOS OS TESTES PASSARAM'
