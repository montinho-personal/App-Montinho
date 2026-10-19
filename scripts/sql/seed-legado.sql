-- Dados legados (formato ANTERIOR à 0009) para testar a migração do logbook.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','treinador@teste.local'),
  ('22222222-2222-2222-2222-222222222222','aluno-a@teste.local'),
  ('33333333-3333-3333-3333-333333333333','aluno-b@teste.local')
on conflict do nothing;
update profiles set role='treinador', nome='Montinho (teste)' where id='11111111-1111-1111-1111-111111111111';
insert into alunos (id, profile_id, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','ativo'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','33333333-3333-3333-3333-333333333333','ativo');
insert into treinos (id, aluno_id, letra, nome) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','A','Treino A da aluna A'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','A','Treino A do aluno B');
insert into exercicios (id, treino_id, ordem, nome, series, reps) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','cccccccc-cccc-cccc-cccc-cccccccccccc',0,'Supino reto',3,'10'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','cccccccc-cccc-cccc-cccc-cccccccccccc',1,'Agachamento',3,'8'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2','cccccccc-cccc-cccc-cccc-ccccccccccc2',0,'Remada',3,'10');
insert into logbook (aluno_id, exercicio_id, data, serie, carga_kg, reps, ie) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','dddddddd-dddd-dddd-dddd-dddddddddddd','2026-05-01',1,30,10,7),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','dddddddd-dddd-dddd-dddd-dddddddddddd','2026-05-01',2,32,9,8),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','dddddddd-dddd-dddd-dddd-dddddddddddd','2026-05-01',2,32,9,8), -- duplicata real (bug antigo)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','2026-05-01',1,60,8,8),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','dddddddd-dddd-dddd-dddd-dddddddddddd','2026-05-03',1,32,10,7),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2','2026-05-02',1,40,10,7);
insert into storage.buckets (id, name, public) values ('fotos-evolucao','fotos-evolucao',false) on conflict do nothing;
insert into storage.objects (bucket_id, name) values ('fotos-evolucao','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/frente.jpg'), ('fotos-evolucao','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/frente.jpg');
