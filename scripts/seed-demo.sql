-- ============================================================================
-- Seed de desenvolvimento (dados FICTÍCIOS) para um projeto Supabase de teste.
-- NÃO rodar em produção. Pressupõe as migrations 0001–0009 aplicadas.
-- Cria: 1 treinador, 2 alunas/alunos, programa com treinos A/B/C, uma versão,
-- 2 sessões concluídas e 1 programa na memória de prescrições.
-- Para criar os usuários no Auth use o painel (Authentication → Add user) ou
-- a API admin; aqui apenas inserimos em auth.users para ambientes locais.
-- ============================================================================
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'montinho@exemplo.local', '{"nome":"Montinho","role":"treinador"}'),
  ('00000000-0000-0000-0000-000000000002', 'aline@exemplo.local', '{"nome":"Aline de Souza","role":"aluno"}'),
  ('00000000-0000-0000-0000-000000000003', 'joao@exemplo.local', '{"nome":"João Pereira","role":"aluno"}')
on conflict (id) do nothing;

-- O trigger handle_new_user cria os profiles; garantimos o papel do treinador.
update profiles set role = 'treinador', nome = 'Montinho' where id = '00000000-0000-0000-0000-000000000001';

insert into alunos (id, profile_id, telefone, sexo, altura_cm, objetivo, status, data_inicio, acesso_ate) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '(11) 99999-0001', 'F', 168, 'Hipertrofia com prioridade de glúteos', 'ativo', current_date - 60, current_date + 30),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '(11) 99999-0002', 'M', 178, 'Ganho de massa', 'ativo', current_date - 30, current_date + 60)
on conflict (id) do nothing;

insert into programas (id, aluno_id, nome, objetivo, nivel, split, modo_semana, frequencia, calendario, metas_volume, prioridades, equipamentos, duracao_min, versao)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Bloco 1 — glúteos', 'hipertrofia', 'intermediario', 'ABC', 'fixa',
  '{"A":1,"B":1,"C":1}', '{"modo":"fixa","dias":[{"dia":1,"letra":"A"},{"dia":3,"letra":"B"},{"dia":5,"letra":"C"}]}',
  '{"gluteo":{"min":12,"max":18},"quadriceps":{"min":8,"max":12},"posteriores":{"min":6,"max":10},"costas":{"min":10,"max":16},"peito":{"min":8,"max":12}}',
  '{gluteo}', '{barra,halter,maquina,polia,banco}', 60, 1)
on conflict (id) do nothing;

insert into treinos (id, aluno_id, letra, nome, ordem, programa_id) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'A', 'Inferior — glúteo/quadríceps', 0, '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'B', 'Superior', 1, '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000001', 'C', 'Inferior — glúteo/posterior', 2, '20000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into exercicios (id, treino_id, ordem, nome, series, reps, descanso_seg, grupo_muscular, grupos_secundarios, grupo_origem, grupo_confianca, series_aquecimento, rir) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-00000000000a', 0, 'Hip thrust', 4, '8-10', 120, 'gluteo', '{posteriores}', 'manual', 'alta', 1, 2),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-00000000000a', 1, 'Hack machine', 4, '10-12', 120, 'quadriceps', '{gluteo}', 'manual', 'alta', 1, 2),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-00000000000a', 2, 'Cadeira abdutora', 3, '15-20', 60, 'gluteo', '{}', 'manual', 'alta', 0, 1),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-00000000000a', 3, 'Panturrilha em pé', 4, '12-15', 45, 'panturrilha', '{}', 'manual', 'alta', 0, 1),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-00000000000b', 0, 'Supino reto barra', 4, '8-10', 90, 'peito', '{triceps}', 'manual', 'alta', 1, 2),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-00000000000b', 1, 'Puxada frontal aberta', 4, '10-12', 90, 'costas', '{biceps}', 'manual', 'alta', 0, 2),
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-00000000000b', 2, 'Remada baixa triângulo', 3, '10-12', 75, 'costas', '{biceps}', 'manual', 'alta', 0, 2),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-00000000000b', 3, 'Elevação lateral', 3, '12-15', 60, 'ombros', '{}', 'manual', 'alta', 0, 1),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-00000000000c', 0, 'Elevação pélvica', 4, '10-12', 90, 'gluteo', '{}', 'manual', 'alta', 1, 2),
  ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-00000000000c', 1, 'Stiff barra', 3, '10-12', 90, 'posteriores', '{gluteo}', 'manual', 'alta', 0, 2),
  ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-00000000000c', 2, 'Mesa flexora', 3, '12-15', 60, 'posteriores', '{}', 'manual', 'alta', 0, 1),
  ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-00000000000c', 3, 'Glúteo coice polia', 3, '15 cada', 45, 'gluteo', '{}', 'manual', 'alta', 0, 1)
on conflict (id) do nothing;

-- Sessões concluídas (semana passada)
insert into training_sessions (id, aluno_id, treino_id, letra, nome_treino, client_key, status, iniciado_em, finalizado_em, duracao_seg, series_planejadas, series_concluidas, feedback_percepcao) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-00000000000a', 'A', 'Inferior — glúteo/quadríceps', 'seed:s1', 'concluida', now() - interval '6 days', now() - interval '6 days' + interval '55 minutes', 3300, 13, 13, 'ok'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-00000000000b', 'B', 'Superior', 'seed:s2', 'concluida', now() - interval '4 days', now() - interval '4 days' + interval '50 minutes', 3000, 13, 12, 'pesado')
on conflict (aluno_id, client_key) do nothing;

insert into session_exercises (id, session_id, exercicio_id, client_key, ordem, nome, grupo_muscular, series_planejadas, status) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'ex:1', 0, 'Hip thrust', 'gluteo', 3, 'concluido'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'ex:2', 1, 'Hack machine', 'quadriceps', 3, 'concluido'),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000005', 'ex:5', 0, 'Supino reto barra', 'peito', 3, 'concluido')
on conflict (session_id, client_key) do nothing;

insert into session_sets (session_id, session_exercise_id, client_key, serie, tipo, carga_kg, reps, rir) values
  ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'set:1:1', 1, 'valida', 80, 10, 2),
  ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'set:1:2', 2, 'valida', 80, 9, 2),
  ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'set:1:3', 3, 'valida', 85, 8, 1),
  ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'set:2:1', 1, 'valida', 100, 12, 2),
  ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'set:2:2', 2, 'valida', 100, 11, 2),
  ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'set:2:3', 3, 'valida', 100, 10, 1),
  ('50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', 'set:3:1', 1, 'valida', 40, 10, 2),
  ('50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', 'set:3:2', 2, 'valida', 40, 9, 2),
  ('50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', 'set:3:3', 3, 'valida', 42.5, 7, 1)
on conflict (session_id, client_key) do nothing;

commit;
