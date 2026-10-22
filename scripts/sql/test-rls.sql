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
  select count(*) into n from exercicios_biblioteca where origem = 'catalogo';
  if n <> 150 then raise exception 'T7b: reaplicar o catálogo duplicou itens (%)', n; end if;
  select md5(string_agg(e::text, '|' order by e.id)) into h_atual from exercicios e;
  if h_atual is distinct from (select a.h from _antes a) then raise exception 'T7b: o catálogo alterou prescrições existentes'; end if;
end $$;

-- Aluno: lê a biblioteca (para executar), mas não escreve nem vê favoritos/equivalências.
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean;
begin
  select count(*) into n from exercicios_biblioteca where origem = 'catalogo';
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
-- ============================================================================
-- T13 — 0019: conquistas idempotentes, reconhecimento do personal, eventos
-- ============================================================================
select test_login('22222222-2222-2222-2222-222222222222');
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'primeiro_treino', '1', now(), 'Primeiro treino concluído');
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'primeiro_treino', '1', now(), 'Primeiro treino concluído') on conflict (aluno_id, codigo, referencia) do nothing;
insert into eventos_chalala (aluno_id, tipo, modelo, formato) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'card_gerado', 'A', 'stories');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from conquistas_aluno;
  if n <> 1 then raise exception 'T13: conquista duplicada por requisição repetida (%)', n; end if;
  begin insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'treinos_10', '1', now(), 'x'); exception when others then ok := true; end;
  if not ok then raise exception 'T13: aluna A criou conquista para B'; end if;
  ok := false;
  begin insert into eventos_chalala (aluno_id, tipo) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'download'); exception when others then ok := true; end;
  if not ok then raise exception 'T13: aluna A registrou evento em nome de B'; end if;
  ok := false;
  begin insert into reconhecimentos (aluno_id, mensagem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'falso'); exception when others then ok := true; end;
  if not ok then raise exception 'T13: aluno escreveu reconhecimento como se fosse o personal'; end if;
  ok := false;
  begin update conquistas_aluno set titulo = 'x'; get diagnostics n = row_count; if n = 0 then ok := true; end if; exception when others then ok := true; end;
  if not ok then raise exception 'T13: aluno alterou conquista'; end if;
  select count(*) into n from eventos_chalala;
  if n <> 0 then raise exception 'T13: aluno leu eventos agregados'; end if;
end $$;
select test_login('11111111-1111-1111-1111-111111111111');
insert into reconhecimentos (aluno_id, conquista_id, mensagem) select aluno_id, id, 'Essa constância merece reconhecimento!' from conquistas_aluno limit 1;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from conquistas_aluno;
  if n <> 0 then raise exception 'T13: aluno B viu conquista de A'; end if;
  select count(*) into n from reconhecimentos;
  if n <> 0 then raise exception 'T13: aluno B viu reconhecimento de A'; end if;
end $$;
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from eventos_chalala;
  if n <> 1 then raise exception 'T13: treinador deveria ver 1 evento (viu %)', n; end if;
  begin insert into eventos_chalala (aluno_id, tipo) values (null, 'download'); exception when others then ok := true; end;
  if not ok then raise exception 'T13: evento sem aluno que não é visita'; end if;
  insert into eventos_chalala (tipo, origem) values ('visita_link', 'card_A');
  raise notice 'T13 OK: conquistas sem duplicar, só o personal assina reconhecimento, eventos isolados';
end $$;
select test_logout();
-- ============================================================================
-- T14 — 0020: treino extra (aluno só pede; personal aprova) e prioridade
-- ============================================================================
select test_login('11111111-1111-1111-1111-111111111111');
insert into config_extra (aluno_id, habilitado, requer_aprovacao) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true, true);
insert into extras_liberados (id, aluno_id, modalidade, titulo, duracao_min) values ('eeeeeeee-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cardio_leve', 'Caminhada', 30), ('eeeeeeee-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mobilidade', 'Mobilidade', 20);
update exercicios set prioridade = 'essencial' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
select test_login('22222222-2222-2222-2222-222222222222');
insert into solicitacoes_extra (aluno_id, extra_id, client_key, data, classificacao) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-0000-0000-0000-00000000000a', 'pedido-1-abc', current_date, 'aprovacao');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from extras_liberados;
  if n <> 1 then raise exception 'T14: aluna A deveria ver só o próprio extra (viu %)', n; end if;
  begin insert into solicitacoes_extra (aluno_id, extra_id, client_key, data, classificacao, status) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-0000-0000-0000-00000000000a', 'pedido-2-abc', current_date, 'aprovacao', 'aprovada'); exception when others then ok := true; end;
  if not ok then raise exception 'T14: aluno se autoaprovou'; end if;
  ok := false;
  begin insert into solicitacoes_extra (aluno_id, extra_id, client_key, data, classificacao) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-0000-0000-0000-00000000000b', 'pedido-3-abc', current_date, 'aprovacao'); exception when others then ok := true; end;
  if not ok then raise exception 'T14: aluno pediu extra de outro aluno'; end if;
  ok := false;
  begin update solicitacoes_extra set status = 'aprovada'; get diagnostics n = row_count; if n = 0 then ok := true; end if; exception when others then ok := true; end;
  if not ok then raise exception 'T14: aluno aprovou o próprio pedido'; end if;
  ok := false;
  begin update config_extra set max_por_semana = 7; get diagnostics n = row_count; if n = 0 then ok := true; end if; exception when others then ok := true; end;
  if not ok then raise exception 'T14: aluno alterou a configuração de extras'; end if;
  ok := false;
  begin insert into solicitacoes_extra (aluno_id, extra_id, client_key, data, classificacao) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-0000-0000-0000-00000000000a', 'pedido-1-abc', current_date, 'aprovacao'); exception when unique_violation then ok := true; end;
  if not ok then raise exception 'T14: pedido duplicado pela mesma client_key'; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from solicitacoes_extra;
  if n <> 0 then raise exception 'T14: aluno B viu pedido de A'; end if;
  select count(*) into n from config_extra;
  if n <> 0 then raise exception 'T14: aluno B viu configuração de A'; end if;
end $$;
select test_login('11111111-1111-1111-1111-111111111111');
update solicitacoes_extra set status = 'aprovada', resposta = 'Pode ir, leve.', decidido_em = now() where client_key = 'pedido-1-abc';
do $$
declare ok boolean := false;
begin
  if (select status from solicitacoes_extra where client_key = 'pedido-1-abc') <> 'aprovada' then raise exception 'T14: personal não conseguiu aprovar'; end if;
  begin update exercicios set prioridade = 'urgente' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'; exception when check_violation then ok := true; end;
  if not ok then raise exception 'T14: aceitou prioridade inválida'; end if;
  raise notice 'T14 OK: extras — aluno só pede, personal aprova, isolamento entre alunos, prioridade validada';
end $$;
select test_logout();
-- T15 — 0025: resumo do histórico de outro app (personal grava; aluno só lê o próprio)
select test_login('11111111-1111-1111-1111-111111111111');
insert into historico_resumo (aluno_id, data, exercicio_nome, nome_normalizado, series, carga_max_kg, volume_kg)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-07', 'Cadeira abdutora', 'cadeira abdutora', 4, 80, 3070);
do $$
declare ok boolean := false;
begin
  begin insert into historico_resumo (aluno_id, data, exercicio_nome, nome_normalizado, series, carga_max_kg, volume_kg)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-07', 'Cadeira abdutora', 'cadeira abdutora', 4, 80, 3070);
  exception when unique_violation then ok := true; end;
  if not ok then raise exception 'T15: resumo duplicado para o mesmo dia/exercício'; end if;
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from historico_resumo;
  if n <> 1 then raise exception 'T15: aluna A deveria ver o próprio resumo (viu %)', n; end if;
  begin insert into historico_resumo (aluno_id, data, exercicio_nome, nome_normalizado, series) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-08', 'X', 'x', 1); exception when others then ok := true; end;
  if not ok then raise exception 'T15: aluno gravou histórico'; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from historico_resumo;
  if n <> 0 then raise exception 'T15: aluno B viu histórico de A'; end if;
  raise notice 'T15 OK: resumo do histórico — personal grava, aluno só lê o próprio, sem duplicar';
end $$;
select test_logout();
-- T16 — 0026: personal registra conquista do aluno, sem duplicar; aluno B continua sem ver
select test_login('11111111-1111-1111-1111-111111111111');
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'treinos_10', '1', now(), 'Dez treinos') on conflict (aluno_id, codigo, referencia) do nothing;
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'treinos_10', '1', now(), 'Dez treinos') on conflict (aluno_id, codigo, referencia) do nothing;
do $$
declare n int;
begin
  select count(*) into n from conquistas_aluno where codigo = 'treinos_10' and aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if n <> 1 then raise exception 'T16: personal não registrou (ou duplicou) a conquista (%)', n; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from conquistas_aluno;
  if n <> 0 then raise exception 'T16: aluno B viu conquista de A'; end if;
  raise notice 'T16 OK: personal registra conquista do aluno sem duplicar; isolamento mantido';
end $$;
select test_logout();
-- T17 — 0027: estratégia importada (personal grava; aluno só lê a própria)
select test_login('11111111-1111-1111-1111-111111111111');
insert into estrategias_aluno (aluno_id, titulo, dados) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Operação Teste', '{"versao":1}');
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from estrategias_aluno;
  if n <> 1 then raise exception 'T17: aluna A deveria ver a própria estratégia (viu %)', n; end if;
  begin insert into estrategias_aluno (aluno_id, dados) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{}'); exception when others then ok := true; end;
  if not ok then raise exception 'T17: aluno gravou estratégia'; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from estrategias_aluno;
  if n <> 0 then raise exception 'T17: aluno B viu estratégia de A'; end if;
  raise notice 'T17 OK: estratégia — personal grava, aluno só lê a própria';
end $$;
select test_logout();
-- T18 — 0028: conquistas 3.0 (códigos novos, versão; aluno só marca “vista” nas próprias)
select test_login('22222222-2222-2222-2222-222222222222');
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo, criterio_versao, evidencia, origem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'criando_raizes', '1', now(), 'Criando raízes', 1, '{"semanas":["2026-08-03","2026-08-10"]}', 'app');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from conquistas_aluno where codigo = 'treinos_10' and criterio_versao = 1 and vista_em is null;
  if n <> 1 then raise exception 'T18: conquista antiga deveria continuar intacta (versão 1)'; end if;
  update conquistas_aluno set vista_em = now() where codigo = 'criando_raizes';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'T18: aluna não conseguiu marcar a própria conquista como vista (%)', n; end if;
  begin update conquistas_aluno set titulo = 'Inventada' where codigo = 'criando_raizes'; exception when others then ok := true; end;
  if not ok then raise exception 'T18: aluna alterou o título da conquista'; end if;
  ok := false;
  begin insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medalha_inventada', '1', now(), 'X'); exception when others then ok := true; end;
  if not ok then raise exception 'T18: código fora do catálogo foi aceito'; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  update conquistas_aluno set vista_em = now() where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T18: aluno B marcou conquista de A'; end if;
  raise notice 'T18 OK: conquistas 3.0 — códigos novos, versão preservada, aluno só marca as próprias como vistas';
end $$;
select test_logout();
-- T19 — 0029: configuração da Evolução Inteligente (personal grava; aluno só lê a própria)
select test_login('11111111-1111-1111-1111-111111111111');
insert into evolucao_config (aluno_id, avisos_ativos, max_por_sessao) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true, 2);
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from evolucao_config where max_por_sessao = 2;
  if n <> 1 then raise exception 'T19: aluna A deveria ler a própria configuração'; end if;
  update evolucao_config set avisos_ativos = false;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T19: aluna alterou a configuração do personal'; end if;
  begin insert into evolucao_config (aluno_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'); exception when others then ok := true; end;
  if not ok then raise exception 'T19: aluno criou configuração'; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from evolucao_config;
  if n <> 0 then raise exception 'T19: aluno B viu configuração de A'; end if;
  raise notice 'T19 OK: evolução inteligente — personal configura, aluno só lê a própria';
end $$;
select test_logout();
-- T20 — 0030: Montinho Desbloqueia (conteúdo: personal edita, aluno lê só o publicado; progresso isolado)
select test_login('11111111-1111-1111-1111-111111111111');
insert into conhecimento_conteudos (id, dados, status) values ('d01', '{"titulo":"x"}', 'publicado'), ('p-rascunho', '{"titulo":"y"}', 'rascunho');
insert into conhecimento_versoes (conteudo_id, versao, status, dados) values ('d01', 2, 'publicado', '{}');
insert into conhecimento_aluno (aluno_id, conteudo_id, origem, disponivel_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd05', 'personal', now());
insert into exercicio_porque (exercicio_id, aluno_id, texto) select id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Para fortalecer o quadríceps com segurança.' from exercicios where treino_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' limit 1;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from conhecimento_conteudos;
  if n <> 1 then raise exception 'T20: aluna deveria ver só o conteúdo publicado (viu %)', n; end if;
  select count(*) into n from conhecimento_versoes;
  if n <> 0 then raise exception 'T20: aluna viu histórico editorial'; end if;
  begin insert into conhecimento_conteudos (id, dados, status) values ('p-invasao', '{}', 'publicado'); exception when others then ok := true; end;
  if not ok then raise exception 'T20: aluna criou conteúdo'; end if;
  insert into conhecimento_aluno (aluno_id, conteudo_id, origem, explorado_em, resposta, acertou) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd02', 'conquista', now(), 'verdade', false);
  select count(*) into n from conhecimento_aluno;
  if n <> 2 then raise exception 'T20: aluna deveria ver as 2 linhas próprias (viu %)', n; end if;
  select count(*) into n from exercicio_porque;
  if n <> 1 then raise exception 'T20: aluna deveria ler o porquê do próprio exercício (viu %)', n; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from conhecimento_aluno;
  if n <> 0 then raise exception 'T20: aluno B viu progresso de A'; end if;
  select count(*) into n from exercicio_porque;
  if n <> 0 then raise exception 'T20: aluno B viu o porquê de A'; end if;
  begin insert into conhecimento_aluno (aluno_id, conteudo_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd09'); exception when others then ok := true; end;
  if not ok then raise exception 'T20: aluno B gravou progresso em nome de A'; end if;
  raise notice 'T20 OK: desbloqueia — conteúdo publicado, versões e progresso isolados';
end $$;
select test_logout();

-- T21 — 0032: troca de exercício (aluna lê equivalências mas não escreve; grava a troca só na própria sessão)
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from exercicio_equivalencias;
  if n <> 0 then raise exception 'T21: tabela de equivalências deveria seguir fechada para a aluna'; end if;
  select count(*) into n from equivalencias_revisadas();
  if n < 1 then raise exception 'T21: aluna deveria ler as equivalências pela função (sem notas)'; end if;
  begin update exercicio_equivalencias set status = 'rejeitada'; get diagnostics n = row_count; if n = 0 then ok := true; end if; exception when others then ok := true; end;
  if not ok then raise exception 'T21: aluna alterou equivalência'; end if;
  perform 1 from information_schema.columns where table_name = 'session_exercises' and column_name = 'substituido_de';
  if not found then raise exception 'T21: coluna substituido_de ausente'; end if;
  raise notice 'T21 OK: troca de exercício — equivalências só pela função, sem escrita';
end $$;
select test_logout();
-- T22 — 0033: novos métodos aceitos; técnica inventada continua barrada
do $$
declare ok boolean := false;
begin
  update exercicios set tecnica = 'triset' where id = (select id from exercicios limit 1);
  update exercicios set tecnica = 'normal' where id = (select id from exercicios limit 1);
  begin update exercicios set tecnica = 'inventada' where id = (select id from exercicios limit 1); exception when check_violation then ok := true; end;
  if not ok then raise exception 'T22: técnica inválida aceita'; end if;
  raise notice 'T22 OK: métodos avançados aceitos e técnica inválida barrada';
end $$;
-- T23 — 0034: alternativas ocultas — personal grava; aluno só lê as próprias e não escreve
select test_login('11111111-1111-1111-1111-111111111111');
insert into alternativas_ocultas (aluno_id, exercicio_id, alternativa_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', a.id, b.id from (select id from exercicios_biblioteca order by id limit 1) a, (select id from exercicios_biblioteca order by id offset 1 limit 1) b;
insert into alternativas_ocultas (aluno_id, exercicio_id, alternativa_id)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', a.id, b.id from (select id from exercicios_biblioteca order by id limit 1) a, (select id from exercicios_biblioteca order by id offset 1 limit 1) b;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from alternativas_ocultas;
  if n <> 1 then raise exception 'T23a: aluno A deveria ver só a própria (1), viu %', n; end if;
  begin
    insert into alternativas_ocultas (aluno_id, exercicio_id, alternativa_id)
      select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', a.id, b.id from (select id from exercicios_biblioteca order by id offset 2 limit 1) a, (select id from exercicios_biblioteca order by id offset 3 limit 1) b;
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T23b: aluno conseguiu gravar alternativa oculta'; end if;
  delete from alternativas_ocultas; get diagnostics n = row_count;
  if n <> 0 then raise exception 'T23c: aluno apagou alternativa oculta'; end if;
  raise notice 'T23 OK: alternativas ocultas por aluno com RLS';
end $$;
select test_logout();
-- T24 — 0035: aluno não vira treinador nem troca e-mail; foto/nome continuam livres
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false; r text; n int;
begin
  begin update profiles set role = 'treinador' where id = auth.uid(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T24a: aluno alterou o próprio papel'; end if;
  ok := false;
  begin update profiles set email = 'x@x.com' where id = auth.uid(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T24b: aluno alterou o próprio e-mail'; end if;
  update profiles set avatar_url = 'https://exemplo/foto.jpg', nome = 'Aluna A' where id = auth.uid(); get diagnostics n = row_count;
  if n <> 1 then raise exception 'T24c: aluno não conseguiu salvar a própria foto'; end if;
  update profiles set avatar_url = 'https://exemplo/x.jpg' where id = '33333333-3333-3333-3333-333333333333'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'T24d: aluno alterou a foto de outro'; end if;
  select role::text into r from profiles where id = auth.uid();
  if r <> 'aluno' then raise exception 'T24e: papel mudou para %', r; end if;
  raise notice 'T24 OK: profiles com colunas travadas (papel/e-mail) e foto própria liberada';
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare n int;
begin
  update profiles set nome = 'Aluna A' where id = '22222222-2222-2222-2222-222222222222'; get diagnostics n = row_count;
  if n <> 1 then raise exception 'T24f: treinador não consegue ajustar nome de aluno'; end if;
  raise notice 'T24f OK: treinador ainda ajusta nome';
end $$;
select test_logout();
-- T25 — 0036: Chalalá no celular — preferências, fila, pós-treino, Bom Dia, testes, métricas
do $$
begin
  if not em_silencio('23:00', '22:00', '05:00') or not em_silencio('04:59', '22:00', '05:00') or em_silencio('05:00', '22:00', '05:00') or em_silencio('12:00', '22:00', '05:00') then raise exception 'T25a: silêncio atravessando a meia-noite'; end if;
  if not em_silencio('13:30', '13:00', '14:00') or em_silencio('14:00', '13:00', '14:00') or em_silencio('10:00', '08:00', '08:00') then raise exception 'T25a: silêncio no mesmo dia'; end if;
  -- 2026-10-19 é segunda; 2026-10-24 é sábado
  if not bom_dia_devido('2026-10-19 05:35', '05:30', '22:00', '05:00') then raise exception 'T25b: bom dia na janela'; end if;
  if bom_dia_devido('2026-10-19 05:25', '05:30', '22:00', '05:00') or bom_dia_devido('2026-10-19 06:16', '05:30', '22:00', '05:00') then raise exception 'T25b: bom dia fora da janela'; end if;
  if bom_dia_devido('2026-10-24 07:05', '07:00', '22:00', '05:00') then raise exception 'T25b: bom dia no sábado'; end if;
  if bom_dia_devido('2026-10-19 05:35', '05:30', '22:00', '06:00') then raise exception 'T25b: bom dia dentro do silêncio'; end if;
  raise notice 'T25a/b OK: silêncio e janela do Bom Dia (dias úteis, 45 min, nunca no silêncio)';
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
select push_registrar('https://push.exemplo.com/aparelho-da-aluna-a-0002', 'p256dh-a2', 'auth-a2', 'teste');
select push_registrar('https://push.exemplo.com/aparelho-da-aluna-a-0003', 'p256dh-a3', 'auth-a3', 'teste');
insert into notificacao_preferencias (profile_id, bom_dia, bom_dia_hora) values ('22222222-2222-2222-2222-222222222222', true, '05:30');
do $$
declare ok boolean := false; n int; tid uuid;
begin
  begin insert into notificacao_preferencias (profile_id) values ('33333333-3333-3333-3333-333333333333'); exception when others then ok := true; end;
  if not ok then raise exception 'T25c: aluno gravou preferência de outro'; end if;
  ok := false;
  begin insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em) values (auth.uid(), 'bom_dia', 'forjado', now(), now()); exception when others then ok := true; end;
  if not ok then raise exception 'T25c: aluno gravou direto na fila'; end if;
  update notificacao_config set chalala_ativo = true; get diagnostics n = row_count;
  if n <> 0 then raise exception 'T25c: aluno ligou a chave geral'; end if;
  ok := false;
  begin perform * from chalala_notificacoes_devidas('chave-teste'); exception when others then ok := true; end;
  if not ok then raise exception 'T25c: aluno chamou o agendador'; end if;
  ok := false;
  begin perform chalala_metricas_push(now() - interval '30 days'); exception when others then ok := true; end;
  if not ok then raise exception 'T25c: aluno leu métricas do painel'; end if;
  tid := notificacao_teste_criar();
  perform notificacao_teste_resultado(tid, 'Teste', 'Corpo', '/aluno', 2, 0);
  if (select status from notificacoes_envios where id = tid) <> 'enviada' then raise exception 'T25d: teste não registrado como enviado'; end if;
  ok := false;
  begin perform notificacao_teste_criar(); exception when others then ok := true; end;
  if not ok then raise exception 'T25d: testes sem intervalo mínimo'; end if;
  raise notice 'T25c/d OK: preferência e fila isoladas, chave geral só do treinador, teste com limite';
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from notificacao_preferencias;
  if n <> 0 then raise exception 'T25e: aluno B viu preferência da aluna A'; end if;
  select count(*) into n from notificacoes_envios;
  if n <> 0 then raise exception 'T25e: aluno B viu notificações da aluna A'; end if;
  perform notificacao_aberta((select id from notificacoes_envios limit 1));
  raise notice 'T25e OK: aluno B não vê nada da aluna A';
end $$;
select test_logout();
-- treino concluído agora → pós-treino para daqui a 90 min (só para quem tem aparelho)
insert into training_sessions (id, aluno_id, treino_id, client_key, letra, nome_treino, iniciado_em, series_planejadas)
values ('99999999-0000-0000-0000-0000000025a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 't25-a1', 'A', 'Treino A', now() - interval '1 hour', 10),
       ('99999999-0000-0000-0000-0000000025a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 't25-a2', 'A', 'Treino A', now() - interval '1 hour', 10),
       ('99999999-0000-0000-0000-0000000025b1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 't25-b1', 'A', 'Treino A', now() - interval '1 hour', 10);
update push_inscricoes set ativo = false where endpoint = 'https://push.exemplo.com/aparelho-do-aluno-b-0001'; -- aluno B sem aparelho ativo
update training_sessions set status = 'concluida', finalizado_em = now() where id in ('99999999-0000-0000-0000-0000000025a1', '99999999-0000-0000-0000-0000000025b1');
update training_sessions set status = 'concluida', finalizado_em = now() where id = '99999999-0000-0000-0000-0000000025a1'; -- reprocessar não duplica
do $$
declare n int; ag timestamptz;
begin
  select count(*), min(agendada_para) into n, ag from notificacoes_envios where categoria = 'pos_treino';
  if n <> 1 then raise exception 'T25f: esperava 1 pós-treino (aluna A com aparelho), veio %', n; end if;
  if ag < now() + interval '89 minutes' or ag > now() + interval '91 minutes' then raise exception 'T25f: pós-treino fora dos 90 min'; end if;
  -- ainda não chegou a hora; e com a chave geral desligada nada sai
  update notificacoes_envios set agendada_para = now() - interval '1 minute' where categoria = 'pos_treino';
  raise notice 'T25f OK: pós-treino agendado pelo banco, 1 por treino';
end $$;
set role anon;
do $$
declare n int;
begin
  select count(*) into n from chalala_notificacoes_devidas('chave-teste');
  if n <> 0 then raise exception 'T25g: saiu notificação com a chave geral desligada'; end if;
end $$;
reset role;
select test_login('11111111-1111-1111-1111-111111111111');
update notificacao_config set chalala_ativo = true, intervalo_minimo_min = 0;
select test_logout();
-- silêncio desligado para o teste não depender da hora em que roda
update notificacao_preferencias set silencio_inicio = '00:00', silencio_fim = '00:00', bom_dia = false where profile_id = '22222222-2222-2222-2222-222222222222';
set role anon;
do $$
declare n int; ok boolean := false;
begin
  begin perform * from chalala_notificacoes_devidas('chave-errada'); exception when others then ok := true; end;
  if not ok then raise exception 'T25h: chave errada aceita'; end if;
  select count(*) into n from chalala_notificacoes_devidas('chave-teste');
  if n <> 2 then raise exception 'T25h: esperava o pós-treino nos 2 aparelhos da aluna A, veio %', n; end if;
  select count(*) into n from chalala_notificacoes_devidas('chave-teste');
  if n <> 0 then raise exception 'T25h: pós-treino repetido'; end if;
end $$;
reset role;
select set_config('t25.id', (select id::text from notificacoes_envios where session_id = '99999999-0000-0000-0000-0000000025a1'), false);
set role anon;
select chalala_notificacao_resultado('chave-teste', current_setting('t25.id')::uuid, 'Seu corpo também merece um Chalalá!', 'Treino feito!', '/aluno', 2, 0);
reset role;
-- segundo treino concluído no mesmo dia: limite de 48 h descarta; treino revertido também
update training_sessions set status = 'concluida', finalizado_em = now() where id = '99999999-0000-0000-0000-0000000025a2';
update notificacoes_envios set agendada_para = now() - interval '1 minute' where session_id = '99999999-0000-0000-0000-0000000025a2';
set role anon;
do $$ begin perform * from chalala_notificacoes_devidas('chave-teste'); end $$;
reset role;
do $$
declare st text; mt text;
begin
  if (select status from notificacoes_envios where session_id = '99999999-0000-0000-0000-0000000025a1') <> 'enviada' then raise exception 'T25i: resultado não gravado'; end if;
  select status, motivo into st, mt from notificacoes_envios where session_id = '99999999-0000-0000-0000-0000000025a2';
  if st <> 'descartada' or mt <> 'limite_pos_treino' then raise exception 'T25i: 2º pós-treino em 48 h deveria ser descartado (% / %)', st, mt; end if;
  raise notice 'T25g/h/i OK: chave geral, 1 envio por aparelho, sem repetição, limite de 48 h';
end $$;
-- treino revertido antes da hora: descarta
update notificacoes_envios set status = 'pendente', motivo = null, agendada_para = now() - interval '1 minute', tentativa_em = null where session_id = '99999999-0000-0000-0000-0000000025a2';
delete from notificacoes_envios where session_id = '99999999-0000-0000-0000-0000000025a1';
update training_sessions set status = 'abandonada' where id = '99999999-0000-0000-0000-0000000025a2';
set role anon;
do $$ begin perform * from chalala_notificacoes_devidas('chave-teste'); end $$;
reset role;
do $$
begin
  if (select motivo from notificacoes_envios where session_id = '99999999-0000-0000-0000-0000000025a2') <> 'treino_revertido' then raise exception 'T25j: treino revertido não descartou o pós-treino'; end if;
  raise notice 'T25j OK: conclusão revertida descarta o pós-treino';
end $$;
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare r jsonb;
begin
  r := chalala_metricas_push(now() - interval '30 days');
  if (r->>'inscritos')::int < 1 or (r->>'ativo')::boolean is not true then raise exception 'T25k: métricas do painel %', r; end if;
  raise notice 'T25k OK: métricas agregadas para o treinador';
end $$;
update notificacao_config set chalala_ativo = false, intervalo_minimo_min = 60;
select test_logout();
-- T26 — 0037: medalhas “Além do necessário” aceitas; código inventado continua barrado
do $$
declare ok boolean := false;
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fiz_o_necessario', '1', now(), 'Fiz o necessário');
  insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'uma_a_mais', '1', now(), 'Uma a mais');
  begin insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'inventada', '1', now(), 'x'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'T26: código de medalha inventado foi aceito'; end if;
  raise notice 'T26 OK: novas medalhas aceitas, código inválido barrado';
end $$;
-- T27 — 0038: “Vai que tá fácil” por aluno (padrão ligado) e evento novo
do $$
begin
  insert into evolucao_config (aluno_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') on conflict (aluno_id) do nothing;
  if not (select vai_que_ta_facil from evolucao_config where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then raise exception 'T27: padrão deveria ser ligado'; end if;
  insert into eventos_chalala (aluno_id, tipo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'chalala_vai_que_ta_facil');
  raise notice 'T27 OK: Vai que tá fácil ligado por padrão e evento aceito';
end $$;
-- T28 — 0040: técnicas configuráveis (config no exercício, blocos na série, tipos novos)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'exercicios' and column_name = 'tecnica_config') then raise exception 'T28: falta exercicios.tecnica_config'; end if;
  if not exists (select 1 from information_schema.columns where table_name = 'session_sets' and column_name = 'blocos') then raise exception 'T28: falta session_sets.blocos'; end if;
  if position('myo_reps' in (select pg_get_constraintdef(oid) from pg_constraint where conname = 'session_sets_tipo_check')) = 0 then raise exception 'T28: tipo myo_reps não aceito'; end if;
  raise notice 'T28 OK: técnicas configuráveis';
end $$;
-- T29 — 0043: medalhas das técnicas avançadas aceitas
do $$
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mestre_tecnicas', '1', now(), 'Mestre das técnicas');
  insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tecnicas_3', '1', now(), 'Três técnicas');
  raise notice 'T29 OK: medalhas das técnicas aceitas';
end $$;
-- T30 — 0044: fase do protocolo e medalhas de fase
do $$
declare ok boolean := false;
begin
  ok := position('intensificacao' in (select pg_get_constraintdef(oid) from pg_constraint where conname = 'programas_fase_check')) > 0;
  if not ok then raise exception 'T30: falta a regra da fase do protocolo'; end if;
  insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'completou_adaptacao', '1', now(), 'Adaptação concluída');
  raise notice 'T30 OK: fase do protocolo e medalhas de fase';
end $$;
-- T31 — 0052: Modo Visitante (acesso vencido não inicia treino; convites só do treinador)
insert into convites (codigo, tipo_acesso, dias) values ('TESTE-31', 'dias', 30);
update alunos set modalidade = 'visitante' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
insert into acessos_visitante (aluno_id, tipo, fim) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dias', now() - interval '1 day');
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false; n int;
begin
  begin
    insert into training_sessions (aluno_id, treino_id, client_key, letra, nome_treino)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','t31-vencido','A','Treino A');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T31a: visitante vencido iniciou treino'; end if;
  select count(*) into n from acessos_visitante;
  if n <> 1 then raise exception 'T31b: visitante deveria ver só o próprio acesso (viu %)', n; end if;
  select count(*) into n from convites;
  if n <> 0 then raise exception 'T31c: visitante leu convites'; end if;
  ok := false;
  begin insert into convites (codigo, tipo_acesso) values ('HACK-31', 'permanente'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T31d: visitante criou convite'; end if;
  insert into perfil_visitante (aluno_id, objetivo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hipertrofia');
end $$;
select test_logout();
update acessos_visitante set fim = now() + interval '30 days' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
insert into training_sessions (aluno_id, treino_id, client_key, letra, nome_treino)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','t31-em-dia','A','Treino A');
select test_logout();
update alunos set modalidade = 'consultoria' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
\echo 'T31 OK: visitante vencido só lê; em dia registra; convites só do treinador'
-- T32 — 0053: convite público mostra só o necessário; reserva respeita as vagas
insert into convites (codigo, tipo_acesso, dias, max_usos) values ('VAGA-UNICA', 'dias', 7, 1);
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false; r record;
begin
  select * into r from convite_publico('vaga-unica');
  if r.situacao <> 'ok' or r.dias <> 7 then raise exception 'T32a: convite público errado'; end if;
  begin perform reservar_convite('VAGA-UNICA'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T32b: aluno conseguiu reservar convite direto'; end if;
end $$;
select test_logout();
do $$
declare n int;
begin
  select count(*) into n from reservar_convite('VAGA-UNICA');
  if n <> 1 then raise exception 'T32c: primeira reserva deveria passar'; end if;
  select count(*) into n from reservar_convite('VAGA-UNICA');
  if n <> 0 then raise exception 'T32d: segunda reserva passou do limite'; end if;
  if (select situacao from convite_publico('VAGA-UNICA')) <> 'esgotado' then raise exception 'T32e: deveria aparecer esgotado'; end if;
end $$;
\echo 'T32 OK: convite público e reserva atômica'
\echo 'TODOS OS TESTES PASSARAM'
