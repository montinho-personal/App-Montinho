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
-- Desde a 0124 quem grava troféu é o servidor (chave de serviço): simulado sem login.
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'primeiro_treino', '1', now(), 'Primeiro treino concluído');
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'primeiro_treino', '1', now(), 'Primeiro treino concluído') on conflict (aluno_id, codigo, referencia) do nothing;
select test_login('22222222-2222-2222-2222-222222222222');
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
insert into config_extra (aluno_id, habilitado, requer_aprovacao) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true, true)
  on conflict (aluno_id) do update set habilitado = true, requer_aprovacao = true; -- 0067 já cria a linha ao criar o aluno
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
  select count(*) into n from config_extra where aluno_id <> 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; -- 0067: B tem a própria linha
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
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo, criterio_versao, evidencia, origem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'criando_raizes', '1', now(), 'Criando raízes', 1, '{"semanas":["2026-08-03","2026-08-10"]}', 'app');
select test_login('22222222-2222-2222-2222-222222222222');
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
-- T33 — 0054: visitante monta só os próprios treinos; não mexe nos do personal
update alunos set modalidade = 'visitante' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update acessos_visitante set fim = now() + interval '30 days' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare tid uuid; ok boolean := false; n int;
begin
  insert into treinos (aluno_id, letra, nome, autoria) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'G', 'Meu treino', 'proprio') returning id into tid;
  insert into exercicios (treino_id, nome, series, reps) values (tid, 'Supino reto', 3, '10');
  update exercicios set series = 4 where treino_id = tid;
  begin insert into treinos (aluno_id, letra, nome, autoria) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'H', 'Falso personal', 'personal'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T33a: visitante criou treino como se fosse do personal'; end if;
  begin insert into treinos (aluno_id, letra, nome, autoria) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'H', 'Treino alheio', 'proprio'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T33b: visitante criou treino para outro aluno'; end if;
  update treinos set nome = 'mexido' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T33c: visitante alterou treino do personal'; end if;
  update exercicios set series = 99 where treino_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T33d: visitante alterou exercício do personal'; end if;
end $$;
select test_logout();
update acessos_visitante set fim = now() - interval '1 day' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  begin insert into treinos (aluno_id, letra, nome, autoria) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'H', 'Vencido', 'proprio'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T33e: visitante vencido criou treino'; end if;
end $$;
select test_logout();
update alunos set modalidade = 'consultoria' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  begin insert into treinos (aluno_id, letra, nome, autoria) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'H', 'Consultoria', 'proprio'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T33f: aluno da consultoria ganhou escrita em treinos'; end if;
end $$;
select test_logout();
\echo 'T33 OK: visitante monta só os próprios treinos'
-- T34 — 0055: desafio do visitante (lê só a própria campanha) e medalha do desafio
do $$
declare cid uuid; outra uuid;
begin
  insert into campanhas (nome, inicio, fim, meta_treinos) values ('Desafio 7 Dias', current_date, current_date + 7, 5) returning id into cid;
  insert into campanhas (nome) values ('Outra campanha') returning id into outra;
  update alunos set modalidade = 'visitante' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  update acessos_visitante set campanha_id = cid, fim = now() + interval '30 days' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  perform set_config('t34.cid', cid::text, false);
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int;
begin
  select count(*) into n from campanhas;
  if n <> 1 then raise exception 'T34a: visitante deveria ver só a própria campanha (viu %)', n; end if;
end $$;
select test_logout();
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'desafio_concluido', current_setting('t34.cid'), now(), 'Desafio concluído');
update alunos set modalidade = 'consultoria' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
\echo 'T34 OK: desafio do visitante e medalha do desafio'
-- T35 — 0057: eventos dos convites (CTA): visitante grava só os próprios
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  insert into cta_eventos (aluno_id, cta, tipo, tela) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'acesso_vencendo', 'exibido', 'inicio');
  begin insert into cta_eventos (aluno_id, cta, tipo) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'acesso_vencendo', 'clicado'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T35a: gravou evento de outro aluno'; end if;
  ok := false;
  begin insert into cta_eventos (aluno_id, cta, tipo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'acesso_vencendo', 'comprou'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'T35b: tipo de evento inválido aceito'; end if;
end $$;
select test_logout();
\echo 'T35 OK: eventos de CTA só do próprio aluno'
-- T36 — 0058: leads e fila do CRM (só treinador; gatilhos só com a sincronização ligada)
do $$
declare n int;
begin
  update alunos set modalidade = 'visitante' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  insert into leads_status (aluno_id, status) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'novo');
  select count(*) into n from crm_fila;
  if n <> 0 then raise exception 'T36a: enfileirou com a sincronização desligada'; end if;
  update crm_config set webhook_url = 'https://exemplo.com/webhook', ativo = true where id = 1;
  update leads_status set status = 'em_conversa' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  insert into cta_eventos (aluno_id, cta, tipo, tela) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'constancia', 'clicado', 'inicio');
  update alunos set modalidade = 'consultoria' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select count(*) into n from crm_fila;
  if n <> 3 then raise exception 'T36b: esperava 3 novidades na fila (status, WhatsApp, virou aluno), veio %', n; end if;
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from crm_fila;
  if n <> 0 then raise exception 'T36c: aluno leu a fila do CRM'; end if;
  select count(*) into n from crm_config;
  if n <> 0 then raise exception 'T36d: aluno leu a configuração do CRM'; end if;
  begin insert into leads_status (aluno_id, status) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'interessado'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T36e: aluno gravou status de lead'; end if;
  ok := false;
  begin perform crm_pendentes('chave-errada'); exception when others then ok := true; end;
  if not ok then raise exception 'T36f: crm_pendentes sem a chave do agendador'; end if;
end $$;
select test_logout();
update crm_config set ativo = false, webhook_url = null where id = 1;
\echo 'T36 OK: leads e fila do CRM só do treinador'
-- T37 — 0061 + conversão: visitante vira aluno sem perder nada; funções do visitante fechadas para anon
do $$
declare n_antes int; n_depois int; t_antes int; t_depois int;
begin
  update alunos set modalidade = 'visitante' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  update acessos_visitante set fim = now() - interval '1 day' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select count(*) into n_antes from training_sessions where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select count(*) into t_antes from treinos where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and autoria = 'proprio';
  if t_antes = 0 then raise exception 'T37 pré: esperava treino próprio do visitante (T33)'; end if;
  -- conversão como a API faz
  update alunos set modalidade = 'consultoria', acesso_ate = null where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select count(*) into n_depois from training_sessions where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select count(*) into t_depois from treinos where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and autoria = 'proprio';
  if n_antes <> n_depois or t_antes <> t_depois then raise exception 'T37a: conversão perdeu histórico (sessões % → %, treinos % → %)', n_antes, n_depois, t_antes, t_depois; end if;
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int;
begin
  if not public.pode_registrar() then raise exception 'T37b: aluno convertido (acesso antigo vencido) não pode registrar'; end if;
  select count(*) into n from treinos where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and autoria = 'proprio';
  if n = 0 then raise exception 'T37c: aluno convertido não vê os treinos que montou'; end if;
end $$;
select test_logout();
set role anon;
do $$
declare ok boolean := false;
begin
  begin perform public.pode_registrar(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T37d: anon executou pode_registrar()'; end if;
  ok := false;
  begin perform public.visitante_em_dia(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T37e: anon executou visitante_em_dia()'; end if;
end $$;
reset role;
\echo 'T37 OK: conversão preserva histórico; funções do visitante só com login'
-- T38 — 0063: visitante grava só o próprio WhatsApp, só se vazio; anon não executa
update alunos set modalidade = 'visitante', telefone = null where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update alunos set telefone = null where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  if not public.salvar_meu_whatsapp('+55 11 98765-4321') then raise exception 'T38a: visitante não gravou o próprio WhatsApp'; end if;
  if public.salvar_meu_whatsapp('+55 11 91111-1111') then raise exception 'T38b: sobrescreveu um WhatsApp já informado'; end if;
end $$;
select test_logout();
do $$
begin
  if (select telefone from alunos where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') is distinct from '+55 11 98765-4321' then raise exception 'T38c: telefone não ficou gravado'; end if;
  if (select telefone from alunos where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') is not null then raise exception 'T38d: mexeu no cadastro de outro aluno'; end if;
end $$;
set role anon;
do $$
declare ok boolean := false;
begin
  begin perform public.salvar_meu_whatsapp('+55 11 98765-4321'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T38e: anon executou salvar_meu_whatsapp()'; end if;
end $$;
reset role;
\echo 'T38 OK: WhatsApp do visitante só no próprio cadastro e só se vazio'
-- T39 — 0068: convite de amigo (+10 dias por amigo cadastrado, até +30)
update alunos set modalidade = 'visitante' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update alunos set modalidade = 'consultoria' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
update acessos_visitante set fim = now() + interval '5 days' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update training_sessions set status = 'em_andamento' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  if public.meu_convite_indicacao() is not null then raise exception 'T39a: código liberado antes de 4 treinos concluídos'; end if;
end $$;
select test_logout();
insert into training_sessions (aluno_id, client_key, status) select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 't39-' || g, 'concluida' from generate_series(1, 4) g;
select test_login('22222222-2222-2222-2222-222222222222');
create temp table _t39 (codigo text);
grant all on _t39 to authenticated;
do $$
declare c1 text; c2 text;
begin
  c1 := public.meu_convite_indicacao();
  c2 := public.meu_convite_indicacao();
  if c1 is null or c1 !~ '^AMIGO-[A-Z2-9]{5}$' then raise exception 'T39b: código inválido (%)', c1; end if;
  if c1 <> c2 then raise exception 'T39c: segunda chamada criou outro código'; end if;
  insert into _t39 values (c1);
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  -- 0102: aluno da consultoria também pega o link (desconto por amigo que fechar)
  if public.meu_convite_indicacao() is null then raise exception 'T39d: aluno da consultoria ficou sem link de indicação (0102)'; end if;
end $$;
select test_logout();
-- 4 amigos se cadastram pelo link (como a API de cadastro faz)
do $$
declare
  fim_antes timestamptz; fim_depois timestamptz; conv uuid; i int; uid uuid; aid uuid; total int;
begin
  select fim into fim_antes from acessos_visitante where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select id into conv from convites where codigo = (select codigo from _t39);
  for i in 1..4 loop
    uid := gen_random_uuid();
    insert into auth.users (id, email) values (uid, 'amigo' || i || '@exemplo.local');
    insert into alunos (profile_id, status, modalidade) values (uid, 'ativo', 'visitante') returning id into aid;
    insert into acessos_visitante (aluno_id, convite_id, tipo, inicio, fim) values (aid, conv, 'dias', now(), now() + interval '30 days');
  end loop;
  select fim into fim_depois from acessos_visitante where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select sum(dias_bonus) into total from indicacoes where indicador_aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if total <> 30 then raise exception 'T39e: bônus total deveria ser 30, foi %', total; end if;
  if abs(extract(epoch from (fim_depois - fim_antes)) - 30 * 86400) > 60 then raise exception 'T39f: acesso não ganhou exatamente +30 dias (% → %)', fim_antes, fim_depois; end if;
  if (select count(*) from indicacoes where indicador_aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 4 then raise exception 'T39g: indicações não registradas'; end if;
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  if (select count(*) from indicacoes) <> 4 then raise exception 'T39h: indicador não vê as próprias indicações'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare ok boolean := false;
begin
  if (select count(*) from indicacoes) <> 0 then raise exception 'T39i: aluno vê indicações de outro'; end if;
  begin insert into indicacoes (indicador_aluno_id, indicado_aluno_id, dias_bonus) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 30); exception when others then ok := true; end;
  if not ok then raise exception 'T39j: aluno conseguiu se dar bônus'; end if;
end $$;
select test_logout();
set role anon;
do $$
declare ok boolean := false;
begin
  begin perform public.meu_convite_indicacao(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T39k: anon executou meu_convite_indicacao()'; end if;
end $$;
reset role;
\echo 'T39 OK: convite de amigo só com 4 treinos, +10 dias por amigo até +30, sem bônus forjado'
-- T40 — 0070: padrão de carga (total × por lado): aluno grava só o próprio
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  insert into preferencias_carga (aluno_id, anilhas, halteres) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'total', 'por_lado');
  update preferencias_carga set anilhas = 'por_lado' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  begin insert into preferencias_carga (aluno_id, anilhas) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'total'); exception when others then ok := true; end;
  if not ok then raise exception 'T40a: aluno gravou o padrão de outro aluno'; end if;
  ok := false;
  begin update preferencias_carga set halteres = 'kg' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; exception when check_violation then ok := true; end;
  if not ok then raise exception 'T40b: valor inválido aceito'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if (select count(*) from preferencias_carga) <> 0 then raise exception 'T40c: aluno vê o padrão de outro'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  if (select anilhas from preferencias_carga where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 'por_lado' then raise exception 'T40d: personal não lê o padrão do aluno'; end if;
end $$;
select test_logout();
\echo 'T40 OK: padrão de carga — cada aluno grava o próprio; personal lê'
-- T41 — 0072: acessos do dia (1 por aluno por dia; só o personal lê; anon não registra)
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  if not public.registrar_acesso() then raise exception 'T41a: aluno não registrou o acesso'; end if;
  perform public.registrar_acesso();
  begin insert into acessos_diarios (aluno_id, dia) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', current_date); exception when others then ok := true; end;
  if not ok then raise exception 'T41b: aluno gravou acesso de outro'; end if;
  if (select count(*) from acessos_diarios) <> 0 then raise exception 'T41c: aluno lê a tabela de acessos'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  if public.registrar_acesso() then raise exception 'T41d: personal contou como acesso de aluno'; end if;
  if (select count(*) from acessos_diarios where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 1 then raise exception 'T41e: deveria haver 1 acesso no dia'; end if;
end $$;
select test_logout();
set role anon;
do $$
declare ok boolean := false;
begin
  begin perform public.registrar_acesso(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T41f: anon executou registrar_acesso()'; end if;
end $$;
reset role;
\echo 'T41 OK: acessos do dia — 1 por aluno por dia, só o personal lê'
-- T42 — 0076: ranking de troféus (só primeiro nome + inicial; quem se esconde some para os outros)
update profiles set nome = 'Ana Maria Souza' where id = '22222222-2222-2222-2222-222222222222';
update profiles set nome = 'Bruno Lima' where id = '33333333-3333-3333-3333-333333333333';
update alunos set status = 'ativo', ranking_visivel = true where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'treinos_10', '1', now(), 'x'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'treinos_25', '1', now(), 'x'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'treinos_50', '1', now(), 'x'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'protocolo_completo', '1', now(), 'x') on conflict do nothing;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare r record; n int;
begin
  select count(*) into n from public.ranking_trofeus();
  if n < 2 then raise exception 'T42a: ranking deveria ter os 2 alunos, tem %', n; end if;
  select * into r from public.ranking_trofeus() where eu;
  if r.nome <> 'Ana S.' then raise exception 'T42b: nome deveria vir abreviado (Ana S.), veio %', r.nome; end if;
  select * into r from public.ranking_trofeus() where nome like 'Bruno%';
  if r.posicao is null or r.nome <> 'Bruno L.' then raise exception 'T42c: Bruno deveria aparecer como “Bruno L.” (%, %)', r.posicao, r.nome; end if;
  if (select count(*) from conquistas_aluno where aluno_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') <> 0 then raise exception 'T42d: aluno leu conquistas de outro'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if not public.definir_ranking_visivel(false) then raise exception 'T42e: não salvou a preferência'; end if;
end $$;
select test_logout();
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  if exists (select 1 from public.ranking_trofeus() where nome like 'Bruno%') then raise exception 'T42f: quem se escondeu continua aparecendo'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  if not exists (select 1 from public.ranking_trofeus() where nome = 'Bruno Lima') then raise exception 'T42g: personal deveria ver todos com nome completo'; end if;
end $$;
select test_logout();
set role anon;
do $$
declare ok boolean := false;
begin
  begin perform public.ranking_trofeus(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T42h: anon executou ranking_trofeus()'; end if;
end $$;
reset role;
\echo 'T42 OK: ranking — nome abreviado, esconder funciona, personal vê todos, anon não'
-- T43 — 0078: medidas, arquivos de avaliação e Olhar de Águia (só o personal ativa)
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean;
begin
  insert into evolucao (aluno_id, data, peso_kg, altura_cm, massa_muscular_kg) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, 70.5, 172, 31.2);
  insert into avaliacoes_arquivos (aluno_id, caminho, nome_original, tipo_mime, tamanho_bytes) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bio.pdf', 'bio.pdf', 'application/pdf', 1000);
  ok := false;
  begin insert into avaliacoes_arquivos (aluno_id, caminho, nome_original, tipo_mime, tamanho_bytes) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/x.pdf', 'x.pdf', 'application/pdf', 10); exception when others then ok := true; end;
  if not ok then raise exception 'T43a: arquivo gravado com caminho de outro aluno'; end if;
  ok := false;
  begin insert into avaliacoes_arquivos (aluno_id, caminho, nome_original, tipo_mime, tamanho_bytes) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/x.exe', 'x.exe', 'application/x-msdownload', 10); exception when others then ok := true; end;
  if not ok then raise exception 'T43b: tipo de arquivo não permitido aceito'; end if;
  ok := false;
  begin insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'olhar_de_aguia', '1', now(), 'x'); exception when others then ok := true; end;
  if not ok then raise exception 'T43c: aluno se deu o Olhar de Águia'; end if;
  if not public.salvar_minha_altura(172) then raise exception 'T43d: altura não salva'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if (select count(*) from avaliacoes_arquivos) <> 0 then raise exception 'T43e: aluno vê arquivo de outro'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo, origem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'olhar_de_aguia', '1', now(), 'Olhar de Águia', 'personal');
  if (select count(*) from avaliacoes_arquivos where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 1 then raise exception 'T43f: personal não vê o arquivo do aluno'; end if;
end $$;
select test_logout();
do $$ begin if (select altura_cm from alunos where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 172 then raise exception 'T43g: altura não foi para o cadastro'; end if; end $$;
\echo 'T43 OK: medidas, arquivos de avaliação e Olhar de Águia'
-- T44 — 0079: desempate do ranking (só o personal grava; o aluno não vê a aderência dos outros)
select test_logout();
update alunos set ranking_visivel = true where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
delete from conquistas_aluno where aluno_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') and codigo not in ('recorde', 'eu_voltei', 'desafio_concluido');
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'treinos_10', '1', now() - interval '1 day', 'x'), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'treinos_25', '1', now() - interval '1 day', 'x'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'treinos_10', '1', now() - interval '9 days', 'x'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'treinos_25', '1', now() - interval '9 days', 'x');
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  begin insert into ranking_desempate (aluno_id, pct_semana) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100); exception when others then ok := true; end;
  if not ok then raise exception 'T44a: aluno gravou a própria nota de desempate'; end if;
  -- Sem números de desempate: empata em troféus e quem chegou primeiro (Bruno, 9 dias atrás) fica na frente.
  if (select posicao from public.ranking_trofeus_v2() where eu) <> 2 then raise exception 'T44b: sem desempate, quem chegou primeiro deveria vir antes'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
insert into ranking_desempate (aluno_id, pct_semana, semanas_seguidas, pct_4sem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, 1, 70), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 75, 5, 95)
  on conflict (aluno_id) do update set pct_semana = excluded.pct_semana, semanas_seguidas = excluded.semanas_seguidas, pct_4sem = excluded.pct_4sem;
do $$
begin
  if (select aderencia_semana from public.ranking_trofeus_v2() where nome = 'Bruno Lima') <> 75 then raise exception 'T44c: personal deveria ver a aderência de todos'; end if;
end $$;
select test_logout();
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare r record;
begin
  select * into r from public.ranking_trofeus_v2() where eu;
  if r.posicao <> 1 or r.aderencia_semana <> 100 then raise exception 'T44d: aderência da semana (100%% × 75%%) deveria desempatar a favor da Ana (%, %)', r.posicao, r.aderencia_semana; end if;
  select * into r from public.ranking_trofeus_v2() where nome like 'Bruno%';
  if r.posicao <> 2 or r.aderencia_semana is not null or not r.mesmo_total_acima then raise exception 'T44e: Bruno deveria ficar em 2º, sem a aderência exposta e marcado como empate em troféus'; end if;
  if exists (select 1 from ranking_desempate) then raise exception 'T44f: aluno leu a tabela de desempate'; end if;
end $$;
select test_logout();
\echo 'T44 OK: desempate — só o personal grava, aderência decide, aluno não vê a dos outros'
-- T45 — 0080: treinos enviados (foto/PDF) — aluno só na própria pasta, não marca como montado; personal vê e resolve
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean;
begin
  insert into treinos_enviados (aluno_id, caminho, tipo_mime, tamanho_bytes) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/t1.jpg', 'image/jpeg', 1000);
  ok := false;
  begin insert into treinos_enviados (aluno_id, caminho, tipo_mime, tamanho_bytes) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/x.jpg', 'image/jpeg', 10); exception when others then ok := true; end;
  if not ok then raise exception 'T45a: gravou na pasta de outro aluno'; end if;
  ok := false;
  begin insert into treinos_enviados (aluno_id, caminho, tipo_mime, tamanho_bytes, status) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/t2.jpg', 'image/jpeg', 10, 'montado'); exception when others then ok := true; end;
  if not ok then raise exception 'T45b: aluno criou pedido já resolvido'; end if;
  update treinos_enviados set status = 'montado' where caminho like 'aaaaaaaa%';
  if exists (select 1 from treinos_enviados where status = 'montado') then raise exception 'T45c: aluno marcou como montado'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if exists (select 1 from treinos_enviados) then raise exception 'T45d: aluno viu o envio de outro'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  update treinos_enviados set status = 'montado', resolvido_em = now() where caminho like 'aaaaaaaa%';
  if not exists (select 1 from treinos_enviados where status = 'montado') then raise exception 'T45e: personal não conseguiu marcar como montado'; end if;
end $$;
select test_logout();
\echo 'T45 OK: treinos enviados — pasta própria, só o personal resolve'
-- T46 — 0086: Strava — chaves só do próprio aluno (o personal não vê); resumo do relógio: aluno nas próprias sessões, personal lê
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean; sid uuid;
begin
  insert into strava_conexoes (aluno_id, athlete_id, access_token, refresh_token, expira_em, consentido_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 123, 'a', 'r', now() + interval '6 hours', now());
  ok := false;
  begin insert into strava_conexoes (aluno_id, athlete_id, access_token, refresh_token, expira_em, consentido_em) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 9, 'a', 'r', now(), now()); exception when others then ok := true; end;
  if not ok then raise exception 'T46a: gravou a conexão de outro aluno'; end if;
  insert into training_sessions (aluno_id, client_key, status, iniciado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 't46-a', 'concluida', now()) returning id into sid;
  insert into sessao_cardio (session_id, aluno_id, atividade_id, fc_media) values (sid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 130);
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare ok boolean; sid uuid;
begin
  if exists (select 1 from strava_conexoes) then raise exception 'T46b: aluno viu a conexão de outro'; end if;
  if exists (select 1 from sessao_cardio) then raise exception 'T46c: aluno viu o batimento de outro'; end if;
  select id into sid from training_sessions where client_key = 't46-a';
  ok := false;
  begin insert into sessao_cardio (session_id, aluno_id, atividade_id) values (coalesce(sid, gen_random_uuid()), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2); exception when others then ok := true; end;
  if not ok then raise exception 'T46d: ligou batimento à sessão de outro aluno'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  if exists (select 1 from strava_conexoes) then raise exception 'T46e: personal viu as chaves do Strava'; end if;
  if not exists (select 1 from sessao_cardio) then raise exception 'T46f: personal não leu o batimento'; end if;
end $$;
select test_logout();
\echo 'T46 OK: Strava — chaves só do aluno, batimento lido pelo personal'
-- T47 — 0087: cardios do Strava — aluno só os dele; personal lê; troféu Relógio no Pulso aceito
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean;
begin
  insert into cardios_strava (atividade_id, aluno_id, tipo, inicio, duracao_seg) values (900001, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Run', now(), 1800);
  ok := false;
  begin insert into cardios_strava (atividade_id, aluno_id, tipo, inicio, duracao_seg) values (900002, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Run', now(), 10); exception when others then ok := true; end;
  if not ok then raise exception 'T47a: gravou cardio de outro aluno'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if exists (select 1 from cardios_strava) then raise exception 'T47b: aluno viu o cardio de outro'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  if not exists (select 1 from cardios_strava) then raise exception 'T47c: personal não leu o cardio'; end if;
end $$;
select test_logout();
do $$
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'strava_conectado', '1', 'Relógio no Pulso', now());
end $$;
\echo 'T47 OK: cardios do Strava e troféu Relógio no Pulso'
-- T48 — 0088: troféus de compartilhamento — cada aluno lê só os próprios eventos e as visitas ao link dele
insert into eventos_chalala (aluno_id, tipo, origem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'download', 'historico'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'download', 'historico');
insert into eventos_chalala (aluno_id, tipo, origem, ref) values (null, 'visita_link', 'card_a', 'c:' || substr(md5('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:chalala'), 1, 12));
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; v int;
begin
  select count(*) filter (where tipo = 'download'), count(*) filter (where tipo = 'visita_link') into n, v from public.meus_eventos_compartilhar();
  if n <> 1 then raise exception 'T48a: esperava 1 download do próprio aluno, veio %', n; end if;
  if v <> 1 then raise exception 'T48b: visita ao link do aluno não apareceu'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if exists (select 1 from public.meus_eventos_compartilhar() where tipo = 'visita_link') then raise exception 'T48c: viu a visita ao link de outro aluno'; end if;
end $$;
select test_logout();
do $$
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'trouxe_amigo', '1', 'Trouxe um Amigo', now());
end $$;
\echo 'T48 OK: troféus de compartilhamento'
-- T49 — 0094: desafios entre alunos — cria, convida, entra por código, placar só para participantes
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare v_id uuid; n int;
begin
  insert into desafios (codigo, criador_aluno_id, nome, tipo, inicio, fim) values ('ABC123', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Teste', 'mais_treinos', current_date, current_date + 7) returning id into v_id;
  if not exists (select 1 from desafio_participantes where desafio_id = v_id and aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and status = 'aceito') then raise exception 'T49a: criador não entrou'; end if;
  begin
    insert into desafios (codigo, criador_aluno_id, nome, tipo, inicio, fim) values ('ABC124', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Falso', 'mais_treinos', current_date, current_date + 7);
    raise exception 'T49b: criou desafio em nome de outro';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into desafio_participantes (desafio_id, aluno_id, status) values (v_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aceito');
    raise exception 'T49c: gravou participante direto';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.dados_desafio(v_id);
  if n <> 1 then raise exception 'T49d: placar com % linhas', n; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare v_id uuid;
begin
  if exists (select 1 from desafios) then raise exception 'T49e: viu desafio sem participar'; end if;
  if exists (select 1 from public.dados_desafio((select id from desafios limit 1))) then raise exception 'T49f: viu placar sem participar'; end if;
  if (select criador from public.desafio_publico('abc123')) is null then raise exception 'T49g: prévia do link não veio'; end if;
  v_id := public.entrar_no_desafio('abc123');
  if not exists (select 1 from desafios where id = v_id) then raise exception 'T49h: entrou mas não vê o desafio'; end if;
  if (select count(*) from public.dados_desafio(v_id)) <> 2 then raise exception 'T49i: placar sem os 2 participantes'; end if;
  if not public.cutucar_no_desafio(v_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '🔥') then raise exception 'T49j: não cutucou'; end if;
  if public.cutucar_no_desafio(v_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '💪') then raise exception 'T49k: cutucou 2x no mesmo dia'; end if;
  begin
    insert into desafios (codigo, criador_aluno_id, nome, tipo, inicio, fim) values ('ABC125', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sem foco', 'musculo', current_date, current_date);
    raise exception 'T49l: músculo sem foco foi aceito';
  exception when check_violation then null;
  end;
  insert into desafios (codigo, criador_aluno_id, nome, tipo, inicio, fim, exercicios) values ('ABC126', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mesmo treino', 'treino_desafio', current_date, current_date, '[{"id":"x","nome":"Agachamento"}]');
end $$;
select test_logout();
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  if (select count(*) from public.minhas_cutucadas()) <> 1 then raise exception 'T49m: cutucada não chegou'; end if;
end $$;
select test_logout();
do $$
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'criador_desafios', '1', 'Criador de Desafios', now());
end $$;
\echo 'T49 OK: desafios entre alunos'
-- T50 — 0095: notificações dos desafios — cutucada vira notificação para quem recebeu; a função do cron roda só com a chave
do $$
begin
  if not exists (select 1 from notificacoes_envios e join alunos a on a.profile_id = e.profile_id where e.categoria = 'desafio' and a.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and e.dedupe like 'desafio_cutucada:%') then
    raise exception 'T50a: cutucada não gerou notificação';
  end if;
  perform * from public.desafio_notificacoes_devidas('chave-teste');
  begin
    perform * from public.desafio_notificacoes_devidas('errada');
    raise exception 'T50b: rodou com chave errada';
  exception when raise_exception then
    if sqlerrm like 'T50b%' then raise; end if;
  end;
end $$;
\echo 'T50 OK: notificações dos desafios'
-- T51 — 0096: Montinho Pulso — aluno grava/lê só o próprio Pulso e consentimento; alertas e registro de acesso só o personal
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  insert into check_ins (aluno_id, data, origem, pulso_energia, pulso_recuperacao, pulso_dificuldades, respondido_em)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 1, 'pulso', 'baixa', 'desconforto', array['falta_tempo'], now());
  insert into pulso_preferencias (aluno_id, consentimento_saude_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now());
  begin
    insert into check_ins (aluno_id, data, origem, pulso_energia) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', current_date + 1, 'pulso', 'alta');
    raise exception 'T51a: gravou Pulso de outro aluno';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into check_ins (aluno_id, data, origem, pulso_energia) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 2, 'pulso', 'otima');
    raise exception 'T51b: aceitou valor fora do cardápio';
  exception when check_violation then null;
  end;
  begin
    insert into check_ins (aluno_id, data, origem, pulso_dificuldades) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 3, 'pulso', array['inventada']);
    raise exception 'T51c: aceitou dificuldade fora do cardápio';
  exception when check_violation then null;
  end;
  begin
    insert into pulso_preferencias (aluno_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    raise exception 'T51d: gravou consentimento de outro aluno';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into acompanhamento_alertas (aluno_id, origem, chave, estado) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pulso', 'pulso:teste', 'dispensado');
    raise exception 'T51e: aluno gravou estado de alerta';
  exception when insufficient_privilege or check_violation then null;
  end;
  if exists (select 1 from acompanhamento_alertas) then raise exception 'T51f: aluno vê alertas'; end if;
  if exists (select 1 from dados_saude_acessos) then raise exception 'T51g: aluno vê registro de acesso'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if exists (select 1 from check_ins where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then raise exception 'T51h: aluno B viu o Pulso do aluno A'; end if;
  if exists (select 1 from pulso_preferencias) then raise exception 'T51i: aluno B viu consentimento alheio'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  if not exists (select 1 from check_ins where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and origem = 'pulso') then raise exception 'T51j: personal não lê o Pulso'; end if;
  insert into acompanhamento_alertas (aluno_id, origem, chave, estado, adiado_ate) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pulso', 'pulso:desconforto:teste', 'adiado', current_date + 3);
  begin
    insert into acompanhamento_alertas (aluno_id, origem, chave, estado) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pulso', 'pulso:desconforto:teste', 'acompanhado');
    raise exception 'T51k: duplicou o mesmo alerta';
  exception when unique_violation then null;
  end;
  begin
    insert into acompanhamento_alertas (aluno_id, origem, chave, estado) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pulso', 'pulso:outro', 'adiado');
    raise exception 'T51l: adiou sem data';
  exception when check_violation then null;
  end;
  insert into dados_saude_acessos (aluno_id, recurso) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pulso_historico');
  begin
    insert into check_ins (aluno_id, data, origem, pulso_energia) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 4, 'pulso', 'alta');
    raise exception 'T51m: personal respondeu o Pulso no lugar do aluno';
  exception when insufficient_privilege or check_violation then null;
  end;
  insert into intervencoes (aluno_id, autor_id, tipo, descricao) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'contato', 'Contato pelo WhatsApp');
end $$;
select test_logout();
do $$
begin
  perform public.pulso_limpar_notas_antigas('chave-teste');
  begin
    perform public.pulso_limpar_notas_antigas('errada');
    raise exception 'T51n: limpou com chave errada';
  exception when raise_exception then
    if sqlerrm like 'T51n%' then raise; end if;
  end;
end $$;
\echo 'T51 OK: Montinho Pulso'
\echo 'TODOS OS TESTES PASSARAM'
-- T52 — 0098: Montinho Cardio — só o personal prescreve; aluno registra/corrige só o próprio (sem apagar); sem duplicar
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  insert into cardio_prescricoes (id, aluno_id, modalidade, duracao_min, intensidade, frequencia_semanal, dias)
    values ('cccccccc-0098-4000-8000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'esteira', 30, 'moderada', 3, '{1,3,5}');
  begin
    insert into cardio_prescricoes (aluno_id, modalidade, duracao_min, frequencia_semanal) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'paraquedas', 30, 3);
    raise exception 'T52a: aceitou modalidade fora da lista';
  exception when check_violation then null;
  end;
  begin
    insert into cardio_prescricoes (aluno_id, modalidade, duracao_min, frequencia_semanal, ativo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'livre', 30, 3, false);
    raise exception 'T52b: desativou sem data';
  exception when check_violation then null;
  end;
  insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'caminhada', 'concluido', 20, 'personal', 'personal-cardio-1', current_date);
  -- “Livre: o aluno escolhe” + “Tanto faz” na prescrição; no registro a modalidade é a que ele fez.
  insert into cardio_prescricoes (aluno_id, modalidade, duracao_min, frequencia_semanal, vinculo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'livre', 20, 2, 'qualquer');
  begin
    insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'livre', 'concluido', 20, 'personal', 'personal-cardio-livre', current_date);
    raise exception 'T52m: registro sem dizer qual cardio fez';
  exception when check_violation then null;
  end;
end $$;
select test_logout();
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int;
begin
  if not exists (select 1 from cardio_prescricoes where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then raise exception 'T52c: aluno não vê a própria prescrição'; end if;
  begin
    insert into cardio_prescricoes (aluno_id, modalidade, duracao_min, frequencia_semanal) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'corrida', 90, 7);
    raise exception 'T52d: aluno prescreveu o próprio cardio';
  exception when insufficient_privilege or check_violation then null;
  end;
  insert into cardio_registros (aluno_id, prescricao_id, modalidade, status, duracao_min, planejado_min, esforco, client_key, data)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-0098-4000-8000-000000000001', 'esteira', 'concluido', 30, 30, 6, 'cardio-aluno-1', current_date);
  begin
    insert into cardio_registros (aluno_id, modalidade, status, duracao_min, client_key, data) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'esteira', 'concluido', 30, 'cardio-aluno-1', current_date);
    raise exception 'T52e: duplicou o mesmo registro';
  exception when unique_violation then null;
  end;
  begin
    insert into cardio_registros (aluno_id, modalidade, status, duracao_min, client_key, data) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'corrida', 'concluido', 30, 'cardio-outro-1', current_date);
    raise exception 'T52f: registrou cardio de outro aluno';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into cardio_registros (aluno_id, modalidade, status, duracao_min, client_key, data) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'corrida', 'nao_realizado', 30, 'cardio-aluno-2', current_date);
    raise exception 'T52g: não realizado com minutos';
  exception when check_violation then null;
  end;
  begin
    insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'corrida', 'concluido', 30, 'personal', 'cardio-aluno-3', current_date);
    raise exception 'T52h: aluno gravou como se fosse o personal';
  exception when insufficient_privilege or check_violation then null;
  end;
  update cardio_registros set duracao_min = 25 where client_key = 'cardio-aluno-1';
  update cardio_registros set removido_em = now() where client_key = 'cardio-aluno-1';
  delete from cardio_registros where client_key = 'cardio-aluno-1';
  get diagnostics n = row_count;
  if n > 0 then raise exception 'T52i: aluno apagou registro de verdade'; end if;
  update cardio_registros set duracao_min = 5 where client_key = 'personal-cardio-1';
  get diagnostics n = row_count;
  if n > 0 then raise exception 'T52j: aluno alterou registro do personal'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if exists (select 1 from cardio_registros where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then raise exception 'T52k: aluno B viu cardio do aluno A'; end if;
  if exists (select 1 from cardio_prescricoes where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then raise exception 'T52l: aluno B viu prescrição do aluno A'; end if;
end $$;
select test_logout();
-- Visitante em dia monta o próprio cardio (autoria 'proprio'); consultoria não; nunca como se fosse do personal.
update alunos set modalidade = 'visitante' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update acessos_visitante set fim = now() + interval '30 days' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  insert into cardio_prescricoes (aluno_id, modalidade, duracao_min, frequencia_semanal, minutos_semana, autoria) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'livre', 24, 5, 120, 'proprio');
  begin insert into cardio_prescricoes (aluno_id, modalidade, duracao_min, frequencia_semanal) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'corrida', 30, 3); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T52n: visitante criou cardio como se fosse do personal'; end if;
  ok := false;
  begin insert into cardio_prescricoes (aluno_id, modalidade, duracao_min, frequencia_semanal, autoria) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'corrida', 30, 3, 'proprio'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T52o: visitante criou cardio para outro aluno'; end if;
end $$;
select test_logout();
update alunos set modalidade = 'consultoria' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  begin insert into cardio_prescricoes (aluno_id, modalidade, duracao_min, frequencia_semanal, autoria) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'corrida', 30, 3, 'proprio'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T52p: aluno da consultoria montou o próprio cardio'; end if;
end $$;
select test_logout();
\echo 'T52 OK: Montinho Cardio'
-- T53 — 0099: carimbos no desempate — só o personal grava; aluno não altera
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  begin insert into ranking_desempate (aluno_id, carimbos) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 999); exception when others then ok := true; end;
  if not ok then raise exception 'T53a: aluno gravou os próprios carimbos'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  insert into ranking_desempate (aluno_id, carimbos) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 12) on conflict (aluno_id) do update set carimbos = 12;
  perform * from public.ranking_trofeus_v2();
end $$;
select test_logout();
\echo 'T53 OK: carimbos no desempate'
-- T54 — 0100: estilo do programa (fichas | livre_metas)
do $$
begin
  if (select estilo from programas limit 1) is distinct from 'fichas' and exists (select 1 from programas) then raise exception 'T54a: programa antigo não ficou como fichas'; end if;
  begin
    update programas set estilo = 'inventado' where id = (select id from programas limit 1);
    if found then raise exception 'T54b: aceitou estilo fora da lista'; end if;
  exception when check_violation then null;
  end;
end $$;
\echo 'T54 OK: treino livre por metas'
-- T55 — 0101: lembrete de cardio — a função do cron roda só com a chave; categoria 'cardio' aceita
do $$
begin
  perform * from public.cardio_notificacoes_devidas('chave-teste');
  begin
    perform * from public.cardio_notificacoes_devidas('errada');
    raise exception 'T55a: rodou com chave errada';
  exception when raise_exception then
    if sqlerrm like 'T55a%' then raise; end if;
  end;
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  select a.profile_id, 'cardio', 'cardio:teste', now() + interval '1 day', now() + interval '2 days', '{}'::jsonb from alunos a where a.profile_id is not null limit 1;
end $$;
\echo 'T55 OK: lembrete de cardio'
-- T56 — 0102: indicação com desconto — amigo que fecha dá 10% a quem indicou; só o personal marca como usado
do $$
declare n int;
begin
  update alunos set modalidade = 'consultoria'
   where id in (select indicado_aluno_id from indicacoes where indicador_aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' order by created_at limit 2);
  select count(*) into n from indicacoes where indicador_aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and fechou_em is not null and desconto_pct = 10;
  if n <> 2 then raise exception 'T56a: esperava 2 amigos que fecharam com 10%%, veio %', n; end if;
  if not exists (select 1 from notificacoes_envios where dedupe like 'indicacao_fechou:%') then raise exception 'T56b: quem indicou não foi avisado'; end if;
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  if (select count(*) from indicacoes where fechou_em is not null) <> 2 then raise exception 'T56c: indicador não vê o próprio desconto'; end if;
  update indicacoes set desconto_usado_em = null, desconto_pct = 30 where indicador_aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
end $$;
select test_logout();
do $$
begin
  if exists (select 1 from indicacoes where desconto_pct = 30) then raise exception 'T56d: aluno mudou o próprio desconto'; end if;
end $$;
select test_login('11111111-1111-1111-1111-111111111111');
do $$
begin
  update indicacoes set desconto_usado_em = now() where indicador_aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and fechou_em is not null;
  if not found then raise exception 'T56e: personal não conseguiu marcar o desconto como usado'; end if;
end $$;
select test_logout();
\echo 'T56 OK: indicação com desconto'
-- T57 — 0103: aviso da indicação premiada — aluno recebe 1 aviso depois do treino concluído
update alunos set modalidade = 'consultoria', status = 'ativo' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
do $$
declare sid uuid;
begin
  insert into training_sessions (aluno_id, client_key, status) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 't57-1', 'em_andamento') returning id into sid;
  update training_sessions set status = 'concluida' where id = sid;
  if not exists (select 1 from notificacoes_envios where dedupe = 'indicacao_novidade:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and agendada_para > now()) then
    raise exception 'T57a: aluno não recebeu o aviso da indicação premiada';
  end if;
  insert into training_sessions (aluno_id, client_key, status) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 't57-2', 'em_andamento') returning id into sid;
  update training_sessions set status = 'concluida' where id = sid;
  if (select count(*) from notificacoes_envios e join alunos a on a.profile_id = e.profile_id where a.id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and e.dedupe like 'indicacao_%') <> 1 then raise exception 'T57b: aviso repetido'; end if;
end $$;
\echo 'T57 OK: aviso da indicação premiada'
-- T58 — 0104: lembrete do troféu perto — o próprio aluno agenda; o novo troca o anterior; outro aluno não agenda
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  perform public.agendar_lembrete_trofeu('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'treinos_10', '🏆 Falta pouco', 'Conclua mais 1 treino.', '/aluno/conquistas');
  perform public.agendar_lembrete_trofeu('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cardio_10', '🏆 Falta só 1', 'Faça mais 1 cardio.', '/aluno/cardio');
end $$;
select test_logout();
do $$
begin
  if (select count(*) from notificacoes_envios e join alunos a on a.profile_id = e.profile_id where a.id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and e.dedupe like 'trofeu:%' and e.status = 'pendente') <> 1 then raise exception 'T58a: lembrete não foi trocado (devia ficar 1 pendente)'; end if;
  if not exists (select 1 from notificacoes_envios where dedupe like 'trofeu:%cardio_10%' and status = 'pendente' and agendada_para > now()) then raise exception 'T58b: lembrete novo não ficou para depois'; end if;
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  begin perform public.agendar_lembrete_trofeu('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'treinos_10', 'x', 'x', '/aluno'); exception when raise_exception then ok := true; end;
  if not ok then raise exception 'T58c: outro aluno agendou lembrete para quem não é ele'; end if;
end $$;
select test_logout();
\echo 'T58 OK: lembrete do troféu perto'
-- T59 — 0105: troféus Fôlego Extra/Dobro aceitos; visitante em dia monta o próprio protocolo livre; aluno da consultoria não
do $$
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cardio_folego_extra', '1', 'Fôlego Extra', now()) on conflict do nothing;
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cardio_dobro', '1', 'Dobro de Fôlego', now()) on conflict do nothing;
end $$;
update alunos set modalidade = 'visitante', status = 'ativo' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update acessos_visitante set fim = now() + interval '10 days' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  perform public.salvar_meu_protocolo_livre('{"peito":{"min":10,"max":14},"inventado":{"min":1,"max":2},"costas":{"min":20,"max":10}}'::jsonb, true);
end $$;
select test_logout();
do $$
declare m jsonb; e text;
begin
  select metas_volume, estilo into m, e from programas where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and ativo;
  if e <> 'livre_metas' then raise exception 'T59a: protocolo livre não ligou (%)', e; end if;
  if m <> '{"peito":{"min":10,"max":14}}'::jsonb then raise exception 'T59b: metas não foram limpas (%)', m; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare ok boolean := false;
begin
  begin perform public.salvar_meu_protocolo_livre('{"peito":{"min":10,"max":14}}'::jsonb, true); exception when raise_exception then ok := true; end;
  if not ok then raise exception 'T59c: aluno da consultoria mudou o próprio protocolo'; end if;
end $$;
select test_logout();
\echo 'T59 OK: Fôlego Extra/Dobro e protocolo livre do visitante'

-- T60 — 0107: troféus do dia em dobro aceitos (Dois Fôlegos, Combo Completo, Dose Dupla)
do $$
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dois_folegos', '1', 'Dois Fôlegos', now()) on conflict do nothing;
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'combo_completo', '1', 'Combo Completo', now()) on conflict do nothing;
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dose_dupla', '1', 'Dose Dupla', now()) on conflict do nothing;
end $$;
\echo 'T60 OK: troféus do dia em dobro'

-- T61 — 0108: desafio escolhe o que conta (musculação, cardio, os dois); placar traz os cardios
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare v_id uuid; v_m uuid; c timestamptz[];
begin
  insert into desafios (codigo, criador_aluno_id, nome, tipo, inicio, fim, atividades) values ('CAR108', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cardio e musculação', 'mais_treinos', current_date - 1, current_date + 2, 'ambos') returning id into v_id;
  select cardios into c from public.dados_desafio(v_id) where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if coalesce(array_length(c, 1), 0) = 0 then raise exception 'T61a: placar sem os cardios'; end if;
  insert into desafios (codigo, criador_aluno_id, nome, tipo, inicio, fim) values ('MUS108', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Só musculação', 'mais_treinos', current_date - 1, current_date + 2) returning id into v_m;
  select cardios into c from public.dados_desafio(v_m) where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if coalesce(array_length(c, 1), 0) <> 0 then raise exception 'T61b: desafio só de musculação trouxe cardios'; end if;
  begin
    insert into desafios (codigo, criador_aluno_id, nome, tipo, inicio, fim, atividades) values ('BAD108', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Inválido', 'mais_treinos', current_date, current_date, 'natacao');
    raise exception 'T61c: atividade inválida aceita';
  exception when check_violation then null;
  end;
end $$;
select test_logout();
\echo 'T61 OK: desafio com musculação e/ou cardio'

-- T62 — 0111: Combo em sequência e volume total de séries aceitos
do $$
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'combo_3', '1', 'Combo 3 Dias', now()) on conflict do nothing;
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'combo_30', '1', '30 Dias de Combo', now()) on conflict do nothing;
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'series_500', '1', '500 Séries', now()) on conflict do nothing;
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'series_1000', '1', '1.000 Séries', now()) on conflict do nothing;
end $$;
\echo 'T62 OK: Combo em sequência e volume total de séries'

-- T63 — 0112: avaliação no Google — o visitante agenda 1 lembrete só para ele, uma vez; responder descarta; outro não agenda; CRM ignora o clique no Google
update alunos set modalidade = 'visitante', status = 'ativo' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  perform public.agendar_lembrete_avaliacao('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
  perform public.agendar_lembrete_avaliacao('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
end $$;
select test_logout();
do $$
begin
  if (select count(*) from notificacoes_envios where dedupe = 'avaliacao:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and status = 'pendente' and agendada_para > now()) <> 1 then raise exception 'T63a: lembrete da avaliação não ficou 1 pendente'; end if;
end $$;
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare ok boolean := false;
begin
  begin perform public.agendar_lembrete_avaliacao('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false); exception when raise_exception then ok := true; end;
  if not ok then raise exception 'T63b: outro aluno mexeu no lembrete de quem não é ele'; end if;
end $$;
select test_logout();
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  perform public.agendar_lembrete_avaliacao('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  insert into cta_eventos (aluno_id, cta, tipo, tela) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'avaliacao_google', 'clicado', 'fim_treino');
end $$;
select test_logout();
do $$
begin
  if exists (select 1 from notificacoes_envios where dedupe = 'avaliacao:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and status = 'pendente') then raise exception 'T63c: responder não descartou o lembrete'; end if;
  if exists (select 1 from crm_fila where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and dados->>'convite' = 'avaliacao_google') then raise exception 'T63d: clique no Google foi ao CRM como WhatsApp'; end if;
end $$;
\echo 'T63 OK: avaliação no Google'

-- T64 — 0113: início do cardio no app — hora do servidor, só do próprio aluno, 1 registro por início; troféus novos aceitos
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare v_ini uuid; v_hora timestamptz; v_reg timestamptz;
begin
  insert into cardio_inicios (aluno_id, modalidade, iniciado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'esteira', '2026-01-01 07:00:00+00') returning id, iniciado_em into v_ini, v_hora;
  if v_hora < now() - interval '1 minute' then raise exception 'T64a: o celular escolheu a hora do início'; end if;
  update cardio_inicios set iniciado_em = '2026-01-01 07:00:00+00' where id = v_ini;
  if (select iniciado_em from cardio_inicios where id = v_ini) <> v_hora then raise exception 'T64b: início mudou depois de gravado'; end if;
  insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data, inicio_id, iniciado_em)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'esteira', 'concluido', 30, 'app', 'cardio-ini-0113-1', current_date, v_ini, '2026-01-01 07:00:00+00') returning iniciado_em into v_reg;
  if v_reg is distinct from v_hora then raise exception 'T64c: registro não ficou com a hora do início do servidor'; end if;
  insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data, iniciado_em)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'esteira', 'concluido', 30, 'app', 'cardio-ini-0113-2', current_date, '2026-01-01 07:00:00+00') returning iniciado_em into v_reg;
  if v_reg is not null then raise exception 'T64d: registro sem início ficou com hora escolhida pelo celular'; end if;
  begin
    insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data, inicio_id)
      values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'esteira', 'concluido', 30, 'app', 'cardio-ini-0113-3', current_date, v_ini);
    raise exception 'T64e: o mesmo início valeu para dois cardios';
  exception when unique_violation then null;
  end;
  update cardio_registros set iniciado_em = '2026-01-01 07:00:00+00' where client_key = 'cardio-ini-0113-1';
  if (select iniciado_em from cardio_registros where client_key = 'cardio-ini-0113-1') <> v_hora then raise exception 'T64f: correção mudou a hora do início'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if exists (select 1 from cardio_inicios where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then raise exception 'T64g: outro aluno viu o início do cardio'; end if;
  begin
    insert into cardio_inicios (aluno_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    raise exception 'T64h: outro aluno gravou início em nome de outro';
  exception when insufficient_privilege then null;
  end;
end $$;
select test_logout();
do $$
declare v_b uuid; v_ini uuid; v_reg timestamptz;
begin
  v_b := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  select id into v_ini from cardio_inicios where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 1;
  insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data)
    values (v_b, 'esteira', 'concluido', 30, 'app', 'cardio-ini-0113-b', current_date);
  update cardio_registros set inicio_id = v_ini where client_key = 'cardio-ini-0113-b';
  if (select inicio_id from cardio_registros where client_key = 'cardio-ini-0113-b') is not null then raise exception 'T64i: registro ganhou início de outro aluno na correção'; end if;
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, descricao, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'trofeus_compartilhados_50', '1', 'x', 'x', now()), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cardio_madrugada', '1', 'x', 'x', now());
  delete from conquistas_aluno where codigo in ('trofeus_compartilhados_50', 'cardio_madrugada');
end $$;
\echo 'T64 OK: início do cardio no app e troféus novos'

-- T65 — 0114: revisão do quiz — o aluno grava a revisão só na própria linha
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  insert into conhecimento_aluno (aluno_id, conteudo_id, explorado_em, resposta, acertou) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd31', now() - interval '4 days', 'verdade', false)
    on conflict (aluno_id, conteudo_id) do update set resposta = excluded.resposta, acertou = excluded.acertou;
  update conhecimento_aluno set revisoes = revisoes + 1, revisao_em = now(), revisao_resposta = 'mito', revisao_acertou = true where conteudo_id = 'd31';
  if (select revisoes from conhecimento_aluno where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and conteudo_id = 'd31') <> 1 then raise exception 'T65a: revisão não gravou'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  update conhecimento_aluno set revisao_acertou = false where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and conteudo_id = 'd31';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T65b: outro aluno mexeu na revisão'; end if;
end $$;
select test_logout();
\echo 'T65 OK: revisão do quiz'

-- T66 — 0115: Conquistas da Tribo — participação, recuperação 10%, missão, idempotência e privacidade
select test_logout();
update cardio_registros set removido_em = now() where removido_em is null;
delete from cardios_strava;
insert into tribo_marcos (trilha, marco, nome) values ('cardio', 20, 'Teste 20'), ('cardio', 40, 'Teste 40'), ('cardio', 100, 'Teste 100');
insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data, realizado_em) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'esteira', 'concluido', 15, 'app', 'tribo-0115-a1', '2026-03-01', '2026-03-01 08:00-03'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bike', 'concluido', 10, 'app', 'tribo-0115-b1', '2026-03-01', '2026-03-01 09:00-03'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'escada', 'concluido', 5, 'app', 'tribo-0115-a2', '2026-03-02', '2026-03-02 08:00-03'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'corrida', 'concluido', 20, 'app', 'tribo-0115-b2', '2026-03-02', '2026-03-02 10:00-03'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'corrida', 'nao_realizado', 0, 'app', 'tribo-0115-b3', '2026-03-03', '2026-03-03 10:00-03');
do $$
declare n int;
begin
  -- 5 min sozinho no dia não vale; “não realizado” não conta.
  select coalesce(sum(minutos), 0) into n from public.tribo_contribuicoes() where trilha = 'cardio';
  if n <> 45 then raise exception 'T66a: total de cardio da tribo deveria ser 45, veio %', n; end if;
end $$;
select test_login('11111111-1111-1111-1111-111111111111');
insert into tribo_missoes (nome, meta_minutos, inicio, fim) values ('Março em movimento', 30, '2026-03-01', '2026-03-31');
insert into tribo_missoes (nome, meta_treinos, inicio, fim, recorrente) values ('Treinos do mês', 500, '2026-01-01', '2026-01-31', true);
select test_logout();
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare v jsonb; n int;
begin
  v := public.tribo_sincronizar();
  if jsonb_array_length(v) <> 3 then raise exception 'T66b: esperava 3 troféus novos para A, veio %', v; end if;
  if (select metodo from tribo_conquistas where codigo = 'tribo_cardio_20') <> 'participacao' then raise exception 'T66c: A participou do marco 20'; end if;
  if (select metodo from tribo_conquistas where codigo = 'tribo_cardio_40') <> 'recuperacao' then raise exception 'T66d: A recupera o marco 40 com 10%%'; end if;
  if (select (dados->>'acumulado')::int from tribo_conquistas where codigo = 'tribo_cardio_40') <> 15 then raise exception 'T66d2: acumulado de A deveria ser 15'; end if;
  if not exists (select 1 from tribo_conquistas where codigo = 'tribo_missao' and metodo = 'missao') then raise exception 'T66e: A ajudou a missão de março'; end if;
  if exists (select 1 from tribo_conquistas where codigo = 'tribo_cardio_100') then raise exception 'T66f: marco 100 não foi alcançado'; end if;
  if jsonb_array_length(public.tribo_sincronizar()) <> 0 then raise exception 'T66g: sincronizar de novo não pode repetir'; end if;
  v := public.tribo_dados();
  if exists (select 1 from jsonb_array_elements(v->'contribuicoes') e where not (e->>'eu')::boolean and e->>'a' is not null) then raise exception 'T66h: aluno viu quem é outro aluno'; end if;
  if (v->'participantes'->>'cardio')::int <> 2 then raise exception 'T66i: participantes de cardio = 2'; end if;
  begin
    insert into tribo_conquistas (aluno_id, codigo, referencia, metodo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tribo_cardio_100', '100', 'participacao', now());
    raise exception 'T66j: aluno gravou troféu da tribo direto';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into tribo_missoes (nome, meta_minutos, inicio, fim) values ('Pirata', 10, '2026-03-01', '2026-03-31');
    raise exception 'T66k: aluno criou missão';
  exception when insufficient_privilege then null;
  end;
  update tribo_conquistas set vista_em = now() where codigo = 'tribo_cardio_20';
  if (select vista_em from tribo_conquistas where codigo = 'tribo_cardio_20') is null then raise exception 'T66l: marcar como visto'; end if;
  select count(*) into n from tribo_missoes where nome = 'Treinos do mês';
  if n < 2 then raise exception 'T66m: missão recorrente não criou o mês seguinte (%)', n; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
begin
  if exists (select 1 from tribo_conquistas where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then raise exception 'T66n: B viu troféus de A'; end if;
  perform public.tribo_sincronizar();
  if (select count(*) from tribo_conquistas where codigo like 'tribo_cardio_%' and metodo = 'participacao') <> 2 then raise exception 'T66o: B participou dos marcos 20 e 40'; end if;
end $$;
select test_logout();
-- Corrigir/excluir registro: o total muda, o troféu já ganho fica.
update cardio_registros set removido_em = now() where client_key = 'tribo-0115-a1';
do $$
begin
  if (select coalesce(sum(minutos), 0) from public.tribo_contribuicoes() where trilha = 'cardio') <> 30 then raise exception 'T66p: excluído saiu do total'; end if;
  if not exists (select 1 from tribo_conquistas where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and codigo = 'tribo_cardio_20') then raise exception 'T66q: troféu não pode ser retirado'; end if;
end $$;
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare v jsonb;
begin
  v := public.tribo_dados();
  if not exists (select 1 from jsonb_array_elements(v->'contribuicoes') e where e->>'a' is not null) then raise exception 'T66r: personal vê quem contribuiu'; end if;
  if (select count(*) from tribo_conquistas) < 5 then raise exception 'T66s: personal lê os troféus da tribo'; end if;
end $$;
select test_logout();
delete from tribo_marcos where nome like 'Teste %';
\echo 'T66 OK: Conquistas da Tribo'

-- T67 — 0116: mobilidade — hora do servidor, concluir só depois de 10 min, só a própria, troféus aceitos
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare v_id uuid; v mobilidade_sessoes;
begin
  insert into mobilidade_sessoes (aluno_id, protocolo, nota_antes, iniciado_em, status, concluido_em)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'superiores', 7, now() - interval '2 hours', 'concluida', now()) returning id into v_id;
  select * into v from mobilidade_sessoes where id = v_id;
  if v.status <> 'em_andamento' or v.concluido_em is not null or v.iniciado_em < now() - interval '1 minute' then raise exception 'T67a: o app escolheu a hora/status'; end if;
  begin
    perform public.concluir_mobilidade(v_id, 3::smallint, 13::smallint);
    raise exception 'T67b: concluiu antes de 10 min';
  exception when raise_exception then
    if sqlerrm not like 'mobilidade: cedo demais%' then raise; end if;
  end;
  begin
    update mobilidade_sessoes set status = 'concluida' where id = v_id;
    raise exception 'T67c: aluno alterou a sessão direto';
  exception when insufficient_privilege then null;
  end;
end $$;
select test_logout();
insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, descricao, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mobilidade_7_inferiores', '1', 'x', 'x', now());
-- simula 15 min depois (como dono do banco) e conclui como o aluno
update mobilidade_sessoes set iniciado_em = now() - interval '15 minutes' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare v mobilidade_sessoes;
begin
  select * into v from public.concluir_mobilidade((select id from mobilidade_sessoes limit 1), 3::smallint, 13::smallint);
  if v.status <> 'concluida' or v.nota_depois <> 3 then raise exception 'T67d: não concluiu'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from mobilidade_sessoes;
  if n <> 0 then raise exception 'T67e: outro aluno viu a mobilidade'; end if;
  begin
    perform public.concluir_mobilidade((select id from mobilidade_sessoes limit 1), 1::smallint, 1::smallint);
  exception when others then null;
  end;
end $$;
select test_logout();
delete from conquistas_aluno where codigo = 'mobilidade_7_inferiores';
\echo 'T67 OK: mobilidade'

-- T68 — 0117: perfil do ranking, cutucar 1×/dia, privacidade
select test_logout();
update alunos set ranking_visivel = true, status = 'ativo' where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare v jsonb;
begin
  perform * from public.ranking_trofeus_v3();
  v := public.ranking_perfil('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  if v is null or v ? 'desempate' = false then raise exception 'T68a: perfil de quem está no ranking'; end if;
  if not public.cutucar_no_ranking('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '🔥') then raise exception 'T68b: cutucar'; end if;
  if public.cutucar_no_ranking('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '💪') then raise exception 'T68c: 2ª cutucada no mesmo dia'; end if;
  if public.cutucar_no_ranking('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '🔥') then raise exception 'T68d: cutucar a si mesmo'; end if;
  if not (public.ranking_perfil('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')->>'cutuquei_hoje')::boolean then raise exception 'T68e: já cutucou hoje'; end if;
  begin
    insert into ranking_cutucadas (de_aluno_id, para_aluno_id, emoji) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '👀');
    raise exception 'T68f: aluno gravou cutucada direto';
  exception when insufficient_privilege then null;
  end;
end $$;
select test_logout();
update alunos set ranking_visivel = false where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
begin
  if public.ranking_perfil('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') is not null then raise exception 'T68g: viu perfil de quem saiu do ranking'; end if;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from public.minhas_cutucadas_ranking();
  if n <> 1 then raise exception 'T68h: B recebeu a cutucada (%)', n; end if;
  perform public.ver_cutucadas_ranking();
  select count(*) into n from public.minhas_cutucadas_ranking();
  if n <> 0 then raise exception 'T68i: marcar vista'; end if;
end $$;
select test_logout();
update alunos set ranking_visivel = true where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
\echo 'T68 OK: perfil do ranking e cutucar'

-- T69 — 0117: “onde o Montinho estaria” — aluno lê só números, nunca entra no ranking
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare v jsonb;
begin
  v := public.montinho_no_ranking();
  -- sem ficha do personal na base de teste: nada a mostrar, sem erro
  if v is not null and not (v ? 'posicao') then raise exception 'T69a: formato'; end if;
  if exists (select 1 from public.ranking_trofeus_v3() r join alunos a on a.id = r.ref join profiles p on p.id = a.profile_id where p.role = 'treinador') then raise exception 'T69b: personal entrou no ranking'; end if;
end $$;
select test_logout();
\echo 'T69 OK: Montinho no ranking'

-- T70 — 0118: resultado dos desafios encerrados (só pela função, só quem aceitou, só depois do fim)
do $$
declare v_fim uuid; v_aberto uuid;
begin
  insert into desafios (codigo, criador_aluno_id, nome, tipo, inicio, fim) values ('RES118', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Encerrado', 'mais_treinos', current_date - 10, current_date - 3) returning id into v_fim;
  insert into desafios (codigo, criador_aluno_id, nome, tipo, inicio, fim) values ('RES119', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aberto', 'mais_treinos', current_date, current_date + 3) returning id into v_aberto;
  perform set_config('t70.fim', v_fim::text, false);
  perform set_config('t70.aberto', v_aberto::text, false);
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; v jsonb;
begin
  n := public.salvar_resultados_desafio(jsonb_build_array(
    jsonb_build_object('desafio', current_setting('t70.fim'), 'venceu', true, 'cumpriu', false),
    jsonb_build_object('desafio', current_setting('t70.aberto'), 'venceu', true, 'cumpriu', false)));
  if n <> 1 then raise exception 'T70a: só o encerrado conta (%)', n; end if;
  begin
    insert into desafio_resultados (desafio_id, aluno_id, venceu) values (current_setting('t70.aberto')::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
    raise exception 'T70b: gravou direto';
  exception when insufficient_privilege then null;
  end;
  v := public.ranking_perfil('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if (v->'desafios'->>'vitorias')::int < 1 then raise exception 'T70c: vitória no perfil'; end if;
  if (v->'desafios'->>'criados')::int < 2 then raise exception 'T70d: criados'; end if;
end $$;
select test_logout();
\echo 'T70 OK: desafios no perfil do ranking'

-- T71 — 0119: mobilidade prescrita — só o personal grava; o aluno lê só a dele
select test_login('11111111-1111-1111-1111-111111111111');
insert into mobilidade_prescricoes (aluno_id, protocolos, dias_semana) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array['superiores'], 5);
select test_logout();
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int;
begin
  select count(*) into n from mobilidade_prescricoes;
  if n <> 1 then raise exception 'T71a: aluno lê a própria (%)', n; end if;
  begin
    insert into mobilidade_prescricoes (aluno_id, protocolos) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', array['inferiores']);
    raise exception 'T71b: aluno gravou';
  exception when insufficient_privilege then null;
  end;
end $$;
select test_logout();
select test_login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  select count(*) into n from mobilidade_prescricoes;
  if n <> 0 then raise exception 'T71c: viu a de outra pessoa'; end if;
end $$;
select test_logout();
\echo 'T71 OK: mobilidade prescrita'

-- T72 — 0119: quem tem mobilidade indicada (prescrição manda; sem ela, a anamnese)
do $$
declare v text[];
begin
  v := public.mobilidade_indicada_protocolos('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if v <> array['superiores'] then raise exception 'T72a: prescrição (%)', v; end if;
  insert into anamnese (aluno_id, dores_atuais, aceita_termos) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dor no joelho e na lombar', true)
    on conflict (aluno_id) do update set dores_atuais = excluded.dores_atuais;
  v := public.mobilidade_indicada_protocolos('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  if v <> array['inferiores'] then raise exception 'T72b: anamnese (%)', v; end if;
  update anamnese set dores_atuais = 'Sou muito encurtado' where aluno_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v := public.mobilidade_indicada_protocolos('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  if v <> array['superiores','inferiores'] then raise exception 'T72c: geral (%)', v; end if;
end $$;
\echo 'T72 OK: mobilidade indicada pela anamnese'

-- T73 — 0121: troféus de feriado aceitos (repetem por referência) e calendário legível
do $$
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo, descricao)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'feriado_musculacao', 'finados:2026', now(), 'Finados Pago', 't'),
         ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'feriado_musculacao', 'natal:2026', now(), 'Natal Pago', 't'),
         ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'feriado_combo', 'finados:2026', now(), 'Finados Completo', 't');
  if (select nome from feriados where data = '2026-11-02') <> 'Finados' then raise exception 'T73: calendário'; end if;
  if not exists (select 1 from pg_proc where proname = 'feriado_notificacoes_devidas') then raise exception 'T73: função do aviso'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
do $$ begin
  if (select count(*) from feriados where data between '2026-11-01' and '2026-12-31') < 4 then raise exception 'T73: aluno não lê o calendário'; end if;
end $$;
reset role;
\echo 'T73 OK: troféus de feriado + calendário'

-- T74 — 0122: visitante vencido não grava cardio, início de cardio nem mobilidade; em dia grava
update alunos set modalidade = 'visitante' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update acessos_visitante set fim = now() - interval '1 day' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean;
begin
  ok := false;
  begin insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'esteira', 'concluido', 20, 'app', 't74-vencido', current_date);
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T74a: visitante vencido registrou cardio'; end if;
  ok := false;
  begin insert into cardio_inicios (aluno_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T74b: visitante vencido começou cardio'; end if;
  ok := false;
  begin insert into mobilidade_sessoes (aluno_id, protocolo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'superiores');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T74c: visitante vencido começou mobilidade'; end if;
end $$;
select test_logout();
update acessos_visitante set fim = now() + interval '30 days' where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('22222222-2222-2222-2222-222222222222');
insert into cardio_registros (aluno_id, modalidade, status, duracao_min, origem, client_key, data) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'esteira', 'concluido', 20, 'app', 't74-em-dia', current_date);
select test_logout();
update alunos set modalidade = 'consultoria' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
\echo 'T74 OK: visitante vencido não grava cardio nem mobilidade'

-- T75 — 0123: eventos da Missão de Hoje (o aluno grava os próprios; tipo desconhecido continua barrado)
select test_login('22222222-2222-2222-2222-222222222222');
insert into eventos_chalala (aluno_id, tipo, modelo, origem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'missao_vista', 'primeiro', 'inicio');
insert into eventos_chalala (aluno_id, tipo, modelo, origem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'missao_clicada', 'primeiro', 'inicio');
do $$
declare ok boolean := false;
begin
  begin insert into eventos_chalala (aluno_id, tipo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'missao_inventada'); exception when check_violation then ok := true; end;
  if not ok then raise exception 'T75: tipo desconhecido aceito'; end if;
  ok := false;
  begin insert into eventos_chalala (aluno_id, tipo) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'missao_vista'); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T75: aluno gravou evento de outro'; end if;
end $$;
select test_logout();
\echo 'T75 OK: eventos da Missão de Hoje'

-- T76 — 0124: aluno não se dá troféu direto no banco; continua lendo e marcando como visto
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false; n int;
begin
  begin insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'semanas_consistentes_12', '1', now(), 'Hack');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'T76a: aluno inseriu troféu para si'; end if;
  select count(*) into n from conquistas_aluno where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if n = 0 then raise exception 'T76b: aluno deixou de ler os próprios troféus'; end if;
  update conquistas_aluno set vista_em = now() where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
insert into conquistas_aluno (aluno_id, codigo, referencia, conquistado_em, titulo, origem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'olhar_de_aguia', '1', now(), 'Olhar de Águia', 'personal') on conflict do nothing;
select test_logout();
\echo 'T76 OK: troféu só pelo servidor ou pelo personal'

-- T77 — 0125: personal grava medidas extras; lista inválida é barrada
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare ok boolean := false; n int;
begin
  insert into evolucao (aluno_id, data, peso_kg, extras) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 90, 71.2, '[{"nome":"Braço esquerdo","valor":29,"unidade":"cm"}]');
  select count(*) into n from evolucao where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and jsonb_array_length(extras) = 1;
  if n = 0 then raise exception 'T77a: extras não gravadas'; end if;
  begin insert into evolucao (aluno_id, data, peso_kg, extras) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date, 70, '{"x":1}');
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'T77b: extras fora de lista aceitas'; end if;
end $$;
select test_logout();
\echo 'T77 OK: medidas extras da avaliação'

-- T78 — 0127: troféus de Monitoramento aceitos (como superusuário: gravação só pelo servidor, 0124)
do $$
declare ok boolean := false;
begin
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'monitoramento_4', '1', 'Radar Ligado', now()) on conflict do nothing;
  insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'monitoramento_26', '1', 'Cientista de Si Mesmo', now()) on conflict do nothing;
  begin
    insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'monitoramento_5', '1', 'x', now());
  exception when check_violation then ok := true; end;
  if not ok then raise exception 'T78: código fora da lista aceito'; end if;
end $$;
\echo 'T78 OK: troféus de Monitoramento'

-- T79 — 0128: evento “Ver 👀” do Montinho no Ranking aceito
insert into eventos_chalala (aluno_id, tipo, origem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'montinho_ranking_aberto', 'ranking');
\echo 'T79 OK: evento do Montinho no Ranking'

-- T80 — 0129: Semanas Completas e Semana Perfeita aceitas
insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'semanas_completas_5', '1', '5 Semanas Completas', now()) on conflict do nothing;
insert into conquistas_aluno (aluno_id, codigo, referencia, titulo, conquistado_em) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'semana_perfeita', '1', 'Semana Perfeita', now()) on conflict do nothing;
\echo 'T80 OK: Semanas Completas e Semana Perfeita'

-- T81 — 0130: ofertas dos planos: aluno lê, só o personal muda; cidade e pode_presencial no cadastro
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int;
begin
  select count(*) into n from ofertas_config;
  if n <> 3 then raise exception 'T81a: aluno não lê as ofertas (%)', n; end if;
  update ofertas_config set ativo = false where id = 'pacote_alunos';
  select count(*) into n from ofertas_config where ativo = false;
  if n <> 0 then raise exception 'T81b: aluno desligou oferta'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare n int;
begin
  update ofertas_config set ativo = false, promo = '1 aula a mais' where id = 'pacote_alunos';
  select count(*) into n from ofertas_config where id = 'pacote_alunos' and ativo = false;
  if n <> 1 then raise exception 'T81c: personal não desligou a oferta'; end if;
  update ofertas_config set ativo = true, promo = null where id = 'pacote_alunos';
  update alunos set pode_presencial = false, cidade = 'Curitiba' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  update alunos set pode_presencial = true, cidade = null where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
end $$;
select test_logout();
\echo 'T81 OK: ofertas dos planos'

-- T82 — 0131: oferta no celular — só o próprio aluno agenda, 1 por janela
select test_login('22222222-2222-2222-2222-222222222222');
select public.agendar_oferta('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pacote', 'Carga travada?', 'Numa aula eu ajusto.');
select public.agendar_oferta('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pacote', 'De novo', 'De novo');
select test_logout();
do $$
declare n int;
begin
  select count(*) into n from notificacoes_envios where dedupe like 'oferta:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:%';
  if n <> 1 then raise exception 'T82a: esperado 1 aviso de oferta, veio %', n; end if;
end $$;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  begin perform public.agendar_oferta('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'qualquer', 'x', 'y'); exception when others then ok := true; end;
  if not ok then raise exception 'T82b: oferta inválida aceita'; end if;
end $$;
select test_logout();
\echo 'T82 OK: oferta no celular'

-- T83 — 0132: áudios dos recados — o aluno só ouve os próprios; só o personal grava
insert into storage.objects (bucket_id, name) values ('recados-audio', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/s1/a.webm'), ('recados-audio', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/s2/b.webm');
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from storage.objects where bucket_id = 'recados-audio';
  if n <> 1 then raise exception 'T83a: aluno A deveria ouvir só o próprio áudio, viu %', n; end if;
  begin insert into storage.objects (bucket_id, name) values ('recados-audio', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/s1/x.webm');
  exception when others then ok := true; end;
  if not ok then raise exception 'T83b: aluno gravou áudio de recado'; end if;
end $$;
select test_logout();
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare n int;
begin
  select count(*) into n from storage.objects where bucket_id = 'recados-audio';
  if n < 2 then raise exception 'T83c: personal não vê os áudios'; end if;
end $$;
select test_logout();
\echo 'T83 OK: áudios dos recados'

-- T84 — 0133: multimodalidade — resultado do bloco, benchmarks e marcas pessoais
insert into training_sessions (id, aluno_id, client_key, modalidade) values
  ('99999999-0000-0000-0000-0000000084a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 't84-a', 'cross'),
  ('99999999-0000-0000-0000-0000000084b1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 't84-b', 'cross');
insert into sessao_blocos (session_id, aluno_id, bloco_id, tipo, formato, condicao, rounds, client_key)
values ('99999999-0000-0000-0000-0000000084b1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'metcon', 'metcon', 'amrap', 'rx', 7, 't84-blb');
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare n int; ok boolean;
begin
  insert into sessao_blocos (session_id, aluno_id, bloco_id, tipo, formato, condicao, tempo_seg, client_key)
  values ('99999999-0000-0000-0000-0000000084a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'metcon', 'metcon', 'for_time', 'scaled', 420, 't84-bla');
  select count(*) into n from sessao_blocos;
  if n <> 1 then raise exception 'T84a: aluno A deveria ver só o próprio bloco, viu %', n; end if;
  ok := false;
  begin insert into sessao_blocos (session_id, aluno_id, bloco_id, tipo, client_key)
    values ('99999999-0000-0000-0000-0000000084b1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'metcon', 't84-ataque');
  exception when others then ok := true; end;
  if not ok then raise exception 'T84b: aluno gravou bloco na sessão de outro'; end if;
  ok := false;
  begin insert into sessao_blocos (session_id, aluno_id, bloco_id, tipo, client_key)
    values ('99999999-0000-0000-0000-0000000084a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'metcon', 'metcon', 't84-dup');
  exception when others then ok := true; end;
  if not ok then raise exception 'T84c: o mesmo bloco foi gravado duas vezes'; end if;
  select count(*) into n from benchmarks where slug in ('fran', 'grace', 'cindy', 'helen', 'murph');
  if n <> 5 then raise exception 'T84d: aluno deveria ler os 5 benchmarks, leu %', n; end if;
  ok := false;
  begin insert into benchmarks (slug, nome, formato) values ('meu-wod', 'Meu WOD', 'amrap');
  exception when others then ok := true; end;
  if not ok then raise exception 'T84e: aluno criou benchmark'; end if;
  insert into marcas_pessoais (aluno_id, nome, tipo, valor, unidade, data) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Back Squat', '1rm', 80, 'kg', current_date);
  ok := false;
  begin insert into marcas_pessoais (aluno_id, nome, tipo, data) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Muscle-Up', 'primeiro', current_date);
  exception when others then ok := true; end;
  if not ok then raise exception 'T84f: aluno registrou “primeiro movimento técnico” (só o personal)'; end if;
  ok := false;
  begin insert into marcas_pessoais (aluno_id, nome, tipo, data) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Clean', '1rm', current_date);
  exception when others then ok := true; end;
  if not ok then raise exception 'T84g: aluno gravou marca de outro'; end if;
end $$;
select test_logout();
-- visitante vencido não grava resultado
create temp table t84_acesso as select * from acessos_visitante where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
update alunos set modalidade = 'visitante' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
insert into acessos_visitante (aluno_id, tipo, fim) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dias', now() - interval '1 day')
on conflict (aluno_id) do update set fim = excluded.fim;
select test_login('22222222-2222-2222-2222-222222222222');
do $$
declare ok boolean := false;
begin
  begin insert into sessao_blocos (session_id, aluno_id, bloco_id, tipo, client_key)
    values ('99999999-0000-0000-0000-0000000084a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'forca', 'forca', 't84-venc');
  exception when others then ok := true; end;
  if not ok then raise exception 'T84h: visitante vencido gravou resultado de bloco'; end if;
end $$;
select test_logout();
delete from acessos_visitante where aluno_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
insert into acessos_visitante select * from t84_acesso;
update alunos set modalidade = 'consultoria' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select test_login('11111111-1111-1111-1111-111111111111');
do $$
declare n int;
begin
  select count(*) into n from sessao_blocos where client_key like 't84-%';
  if n <> 2 then raise exception 'T84i: personal deveria ver os 2 blocos, viu %', n; end if;
  insert into marcas_pessoais (aluno_id, nome, tipo, data, origem) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Muscle-Up', 'primeiro', current_date, 'personal');
  select count(*) into n from treinos where modalidade <> 'musculacao';
  if n <> 0 then raise exception 'T84j: treinos antigos deveriam continuar como musculação'; end if;
end $$;
select test_logout();
\echo 'T84 OK: multimodalidade (blocos, benchmarks, marcas)'
