-- ============================================================================
-- Aluno FICTÍCIO com 8 semanas de histórico simulado (para demonstração).
-- Pode rodar em produção: cria só dados de um aluno de teste, identificado
-- pelo e-mail lucas.teste@example.com. Para remover tudo depois, rode
-- scripts/remover-aluno-teste.sql.
--
-- O que é criado:
--   • conta de login do aluno (e-mail/senha abaixo) com papel "aluno";
--   • programa Upper/Lower 4x (Seg A, Ter B, Qui C, Sex D) com metas de volume;
--   • 2 versões do plano (troca de exercício na semana 5, com histórico);
--   • ~29 sessões concluídas em 8 semanas (semana 3 com faltas, de propósito),
--     com séries, cargas progressivas, RIR e percepção do treino;
--   • medidas a cada 2 semanas, check-ins semanais, um pedido de adaptação
--     respondido e notas do treinador visíveis ao aluno.
-- ============================================================================
do $$
declare
  v_uid      constant uuid := 'a0000000-0000-4000-8000-000000000001';  -- auth.users / profiles
  v_aluno    constant uuid := 'a0000000-0000-4000-8000-000000000002';
  v_prog     constant uuid := 'a0000000-0000-4000-8000-000000000003';
  v_treinador uuid;
  v_inicio   date := date_trunc('week', current_date)::date - 49;     -- segunda-feira, 7 semanas antes desta
  v_troca    date := date_trunc('week', current_date)::date - 21;     -- início da semana 5
  v_v1 uuid; v_v2 uuid;
  w int; d int; s int; dia_semana int; v_data date; v_ini timestamptz;
  v_letra text; v_treino uuid; v_sess uuid; v_se uuid;
  ex record; v_carga numeric; v_reps int; v_planejadas int; v_feitas int;
  v_lo int; v_hi int; v_pular boolean;
  dias constant int[] := array[0, 1, 3, 4];          -- seg, ter, qui, sex (offset na semana)
  letras constant text[] := array['A', 'B', 'C', 'D'];
begin
  if exists (select 1 from alunos where id = v_aluno) then
    raise notice 'Aluno de teste já existe; nada a fazer (rode remover-aluno-teste.sql para recriar).';
    return;
  end if;

  select id into v_treinador from profiles where role = 'treinador' order by created_at limit 1;

  -- 1) Conta de login (senha: Aluno-Teste-2026) -----------------------------
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
          'lucas.teste@example.com', extensions.crypt('Aluno-Teste-2026', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{"nome":"Lucas Andrade (teste)","role":"aluno"}',
          v_inicio - 3, now(), '', '', '', '');
  -- O serviço de login falha com NULL nestes campos de texto.
  update auth.users set phone_change = '', phone_change_token = '', email_change_token_current = '',
                        reauthentication_token = ''
  where id = v_uid;
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text, 'email',
          jsonb_build_object('sub', v_uid::text, 'email', 'lucas.teste@example.com', 'email_verified', true),
          now(), v_inicio - 3, now());
  update profiles set nome = 'Lucas Andrade (teste)', role = 'aluno' where id = v_uid;

  insert into alunos (id, profile_id, telefone, data_nascimento, sexo, altura_cm, objetivo, observacoes,
                      status, data_inicio, acesso_ate, created_at)
  values (v_aluno, v_uid, '(11) 90000-0000', '1994-03-12', 'M', 178,
          'Hipertrofia — ganhar massa magra mantendo o percentual de gordura',
          'ALUNO FICTÍCIO para demonstração do app.', 'ativo', v_inicio, current_date + 60, v_inicio - 3);

  insert into anamnese (aluno_id, objetivo_principal, prazo_meses, ja_treinou, tempo_treino_meses, frequencia_semanal,
                        lesoes, dores_atuais, onde_treina, equipamentos_disponiveis, horas_sono, aceita_termos, assinado_em)
  values (v_aluno, 'Hipertrofia', 6, true, 24, 4, 'Entorse de tornozelo direito (2022), recuperado',
          'Leve desconforto no joelho esquerdo em afundos profundos', 'academia',
          '{barra,halter,maquina,polia,banco,smith}', 7, true, v_inicio - 3);

  -- 2) Programa e treinos ----------------------------------------------------
  insert into programas (id, aluno_id, nome, objetivo, nivel, split, modo_semana, frequencia, calendario,
                         metas_volume, prioridades, equipamentos, duracao_min, versao, created_at)
  values (v_prog, v_aluno, 'Bloco 1 — Upper/Lower 4x', 'hipertrofia', 'intermediario', 'Upper/Lower', 'fixa',
          '{"A":1,"B":1,"C":1,"D":1}',
          '{"modo":"fixa","dias":[{"dia":1,"letra":"A"},{"dia":2,"letra":"B"},{"dia":3,"letra":null},{"dia":4,"letra":"C"},{"dia":5,"letra":"D"},{"dia":6,"letra":null},{"dia":0,"letra":null}]}',
          '{"peito":{"min":10,"max":16},"costas":{"min":12,"max":18},"quadriceps":{"min":10,"max":16},"posteriores":{"min":8,"max":12},"gluteo":{"min":6,"max":12},"ombro_lateral":{"min":6,"max":12},"biceps":{"min":6,"max":10},"triceps":{"min":6,"max":10},"panturrilha":{"min":6,"max":10}}',
          '{peito,costas}', '{barra,halter,maquina,polia,banco,smith}', 65, 2, v_inicio - 1);

  insert into treinos (id, aluno_id, letra, nome, ordem, programa_id, versao, duracao_estimada_min, created_at) values
    ('a0000000-0000-4000-8000-0000000000a1', v_aluno, 'A', 'Superior 1 — força', 0, v_prog, 2, 65, v_inicio - 1),
    ('a0000000-0000-4000-8000-0000000000b1', v_aluno, 'B', 'Inferior 1 — quadríceps', 1, v_prog, 1, 65, v_inicio - 1),
    ('a0000000-0000-4000-8000-0000000000c1', v_aluno, 'C', 'Superior 2 — volume', 2, v_prog, 1, 60, v_inicio - 1),
    ('a0000000-0000-4000-8000-0000000000d1', v_aluno, 'D', 'Inferior 2 — posterior e glúteo', 3, v_prog, 1, 65, v_inicio - 1);

  -- carga_base em kg (halteres: por mão). removido_em marca a troca da semana 5.
  create temp table _ex (id uuid, treino uuid, ordem int, nome text, series int, reps text, descanso int,
                         grupo grupo_muscular, sec grupo_muscular[], aquec int, rir int, carga_base numeric,
                         passo numeric, desde date, ate date) on commit drop;
  insert into _ex values
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000a1',0,'Supino reto barra',4,'6-8',120,'peito','{triceps,ombro_anterior}',2,2,60,2.5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000a1',1,'Remada curvada barra',4,'8-10',120,'costas','{biceps}',1,2,55,2.5,null,v_troca),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000a1',1,'Remada cavalinho',4,'8-10',120,'costas','{biceps}',1,2,50,2.5,v_troca,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000a1',2,'Desenvolvimento com halteres',3,'8-10',90,'ombro_anterior','{triceps}',0,2,20,1,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000a1',3,'Rosca direta barra W',3,'10-12',60,'biceps','{}',0,1,25,1,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000a1',4,'Tríceps corda na polia',3,'10-12',60,'triceps','{}',0,1,25,2.5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000b1',0,'Agachamento livre',4,'6-8',150,'quadriceps','{gluteo}',2,2,80,2.5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000b1',1,'Stiff com barra',3,'8-10',120,'posteriores','{gluteo}',1,2,60,2.5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000b1',2,'Leg press 45°',3,'10-12',120,'quadriceps','{gluteo}',0,2,180,10,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000b1',3,'Mesa flexora',3,'10-12',75,'posteriores','{}',0,1,40,2.5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000b1',4,'Panturrilha em pé na máquina',4,'12-15',60,'panturrilha','{}',0,1,60,5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000c1',0,'Supino inclinado com halteres',3,'8-10',90,'peito','{ombro_anterior,triceps}',1,2,26,2,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000c1',1,'Puxada frontal aberta',4,'8-10',90,'costas','{biceps}',1,2,60,2.5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000c1',2,'Elevação lateral com halteres',4,'12-15',60,'ombro_lateral','{}',0,1,10,1,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000c1',3,'Rosca martelo',3,'10-12',60,'biceps','{antebraco}',0,1,14,1,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000c1',4,'Tríceps francês com halter',3,'10-12',60,'triceps','{}',0,1,16,1,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000d1',0,'Levantamento terra',3,'5-6',180,'posteriores','{gluteo,lombar,costas}',2,2,100,5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000d1',1,'Hip thrust com barra',4,'8-10',120,'gluteo','{posteriores}',1,2,100,5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000d1',2,'Cadeira extensora',3,'12-15',60,'quadriceps','{}',0,1,50,2.5,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000d1',3,'Afundo búlgaro com halteres',3,'8-10',90,'quadriceps','{gluteo}',0,2,16,1,null,null),
    (gen_random_uuid(),'a0000000-0000-4000-8000-0000000000d1',4,'Abdominal na polia',3,'12-15',60,'abdomen','{}',0,1,30,2.5,null,null);

  insert into exercicios (id, treino_id, ordem, nome, series, reps, descanso_seg, grupo_muscular, grupos_secundarios,
                          grupo_origem, grupo_confianca, series_aquecimento, rir, removido_em, created_at, observacoes)
  select id, treino, ordem, nome, series, reps, descanso, grupo, sec, 'manual', 'alta', aquec, rir,
         case when ate is not null then ate::timestamptz + interval '9 hours' end,
         coalesce(desde, v_inicio - 1)::timestamptz,
         case nome when 'Afundo búlgaro com halteres' then 'Amplitude confortável para o joelho esquerdo.'
                   when 'Supino reto barra' then 'Escápulas encaixadas; 2 séries de aquecimento leves.' end
  from _ex;

  -- 3) Versões do plano ------------------------------------------------------
  insert into programa_versoes (aluno_id, programa_id, versao, autor_id, motivo, snapshot, diff_resumo, created_at)
  values (v_aluno, v_prog, 1, v_treinador, 'Programa inicial após anamnese',
          jsonb_build_object('programa', jsonb_build_object('nome','Bloco 1 — Upper/Lower 4x','split','Upper/Lower'),
            'treinos', (select jsonb_agg(jsonb_build_object('letra', t.letra, 'nome', t.nome, 'exercicios',
               (select jsonb_agg(jsonb_build_object('nome', e.nome, 'series', e.series, 'reps', e.reps, 'grupo', e.grupo) order by e.ordem)
                  from _ex e where e.treino = t.id and e.desde is null)) order by t.ordem)
               from treinos t where t.aluno_id = v_aluno)),
          'Versão inicial: 4 treinos, 20 exercícios', v_inicio - 1)
  returning id into v_v1;
  insert into programa_versoes (aluno_id, programa_id, versao, autor_id, motivo, snapshot, diff_resumo, created_at)
  values (v_aluno, v_prog, 2, v_treinador, 'Desconforto lombar na remada curvada (semana 4)',
          jsonb_build_object('programa', jsonb_build_object('nome','Bloco 1 — Upper/Lower 4x','split','Upper/Lower'),
            'treinos', (select jsonb_agg(jsonb_build_object('letra', t.letra, 'nome', t.nome, 'exercicios',
               (select jsonb_agg(jsonb_build_object('nome', e.nome, 'series', e.series, 'reps', e.reps, 'grupo', e.grupo) order by e.ordem)
                  from _ex e where e.treino = t.id and e.ate is null)) order by t.ordem)
               from treinos t where t.aluno_id = v_aluno)),
          'A: Remada curvada barra → Remada cavalinho (mesmas séries)', v_troca::timestamptz + interval '9 hours')
  returning id into v_v2;

  -- 4) Sessões simuladas -----------------------------------------------------
  for w in 0..7 loop
    for d in 1..4 loop
      v_data := v_inicio + w * 7 + dias[d];
      exit when v_data >= current_date;
      -- semana 3 (w=2): gripe, só treinou A; mais duas faltas pontuais
      continue when (w = 2 and d > 1) or (w = 5 and d = 4) or (w = 6 and d = 2);
      v_letra := letras[d];
      v_treino := (array['a0000000-0000-4000-8000-0000000000a1','a0000000-0000-4000-8000-0000000000b1',
                         'a0000000-0000-4000-8000-0000000000c1','a0000000-0000-4000-8000-0000000000d1'])[d]::uuid;
      v_ini := (v_data::timestamp + time '18:20' + make_interval(mins => (w * 7 + d * 5) % 35)) at time zone 'America/Sao_Paulo';
      v_sess := gen_random_uuid(); v_planejadas := 0; v_feitas := 0;

      insert into training_sessions (id, aluno_id, treino_id, programa_versao_id, letra, nome_treino, client_key, status,
                                     iniciado_em, finalizado_em, duracao_seg, snapshot, origem, created_at)
      select v_sess, v_aluno, v_treino, case when v_data >= v_troca then v_v2 else v_v1 end, v_letra::treino_letra, t.nome,
             'sim:' || w || ':' || d, 'em_andamento', v_ini, null, null, jsonb_build_object('origem', 'simulacao'), 'app', v_ini
      from treinos t where t.id = v_treino;

      for ex in select * from _ex
                where treino = v_treino
                  and (desde is null or v_data >= desde) and (ate is null or v_data < ate)
                order by ordem loop
        v_se := gen_random_uuid();
        v_lo := split_part(ex.reps, '-', 1)::int; v_hi := split_part(ex.reps, '-', 2)::int;
        -- progressão dupla: reps sobem dentro da faixa; carga sobe a cada 2 semanas
        v_carga := ex.carga_base + ex.passo * floor(greatest(w - case when ex.desde is not null then 4 else 0 end, 0) / 2.0);
        if w = 3 then v_carga := v_carga - ex.passo; end if;          -- volta da gripe: carga reduzida
        v_pular := (ex.nome = 'Afundo búlgaro com halteres' and w = 4);  -- dia com dor no joelho
        v_planejadas := v_planejadas + ex.series;

        insert into session_exercises (id, session_id, exercicio_id, client_key, ordem, nome, grupo_muscular,
                                       series_planejadas, prescricao, status, observacao_aluno, created_at)
        values (v_se, v_sess, ex.id, 'ex:' || ex.id, ex.ordem, ex.nome, ex.grupo, ex.series,
                jsonb_build_object('series', ex.series, 'reps', ex.reps, 'descanso_seg', ex.descanso, 'rir', ex.rir),
                case when v_pular then 'nao_consegui' else 'concluido' end,
                case when v_pular then 'Joelho esquerdo incomodou na descida.' end, v_ini);

        continue when v_pular;
        for s in 1..ex.series loop
          v_reps := least(v_hi, v_lo + ((w % 2) * (v_hi - v_lo) / 2) + case when s = 1 then 1 else 0 end) - case when s = ex.series then 1 else 0 end;
          -- última série da última sessão de algumas semanas sem fechar (realismo)
          continue when s = ex.series and (w * 4 + d + ex.ordem) % 11 = 0;
          insert into session_sets (session_id, session_exercise_id, client_key, serie, tipo, carga_kg, reps, rir, concluida_em, created_at)
          values (v_sess, v_se, 'set:' || ex.id || ':' || s, s, 'valida', v_carga, greatest(v_reps, v_lo - 1),
                  greatest(ex.rir - case when s = ex.series then 1 else 0 end, 0),
                  v_ini + make_interval(mins => ex.ordem * 11 + s * 3), v_ini + make_interval(mins => ex.ordem * 11 + s * 3));
          v_feitas := v_feitas + 1;
        end loop;
      end loop;

      update training_sessions set status = 'concluida',
        finalizado_em = v_ini + make_interval(mins => 52 + (w + d) % 15),
        duracao_seg = (52 + (w + d) % 15) * 60,
        series_planejadas = v_planejadas, series_concluidas = v_feitas,
        feedback_percepcao = case when w = 3 then 'pesado' when w = 4 and d = 4 then 'dor'
                                  when (w + d) % 5 = 0 then 'leve' else 'ok' end,
        feedback_comentario = case when w = 3 and d = 1 then 'Ainda sem fôlego depois da gripe.'
                                   when w = 4 and d = 4 then 'Joelho esquerdo incomodou no búlgaro, pulei.'
                                   when w = 7 and d = 1 then 'Supino subiu! Muito bom.' end
      where id = v_sess;

      if w = 4 and d = 4 then
        insert into adaptacoes (aluno_id, session_id, session_exercise_id, exercicio_nome, motivo, descricao, status,
                                resposta, respondido_por, respondido_em, created_at)
        values (v_aluno, v_sess, null, 'Afundo búlgaro com halteres', 'desconforto',
                'Dor leve no joelho esquerdo na descida.', 'respondida',
                'Na próxima, faça com amplitude menor e apoio do pé de trás mais alto. Se doer, troque por leg press unilateral.',
                v_treinador, v_ini + interval '20 hours', v_ini + interval '1 hour');
      end if;
    end loop;
  end loop;

  update alunos set ultimo_treino_em = (select max(finalizado_em) from training_sessions where aluno_id = v_aluno)
  where id = v_aluno;

  -- 5) Medidas a cada 2 semanas e check-ins semanais --------------------------
  insert into evolucao (aluno_id, data, peso_kg, gordura_pct, cintura_cm, quadril_cm, braco_cm, coxa_cm, peito_cm, observacoes)
  select v_aluno, v_inicio + k * 14, 78.0 + k * 0.45, 18.0 - k * 0.3, 84.0 - k * 0.3, 98.0 + k * 0.1,
         36.0 + k * 0.25, 57.0 + k * 0.3, 101.0 + k * 0.4,
         case k when 0 then 'Avaliação inicial' when 3 then 'Boa evolução de braço e peito' end
  from generate_series(0, 3) k
  where v_inicio + k * 14 <= current_date;

  insert into check_ins (aluno_id, data, energia, sono, dor, motivacao, estresse, notas)
  select v_aluno, v_inicio + k * 7 + 6, case when k = 2 then 4 else 7 + (k % 3) end, 6 + (k % 3),
         case when k = 4 then 4 else 1 + (k % 2) end, case when k = 2 then 5 else 8 end, 4 + (k % 3),
         case k when 2 then 'Gripado, treinei só um dia.' when 4 then 'Joelho chato no fim da semana.' end
  from generate_series(0, 7) k
  where v_inicio + k * 7 + 6 < current_date;

  -- 6) Notas do treinador ----------------------------------------------------
  if v_treinador is not null then
    insert into intervencoes (aluno_id, autor_id, tipo, titulo, descricao, referencia, visivel_aluno, created_at) values
      (v_aluno, v_treinador, 'nota', 'Início do acompanhamento',
       'Bloco de 8 semanas focado em peito e costas, 4x por semana. Meta: subir carga mantendo 1–2 RIR.',
       '{}', true, v_inicio::timestamptz + interval '8 hours'),
      (v_aluno, v_treinador, 'revisao_treino', 'Troca da remada',
       'Troquei a remada curvada pela remada cavalinho por causa do desconforto lombar. Mesmas séries.',
       jsonb_build_object('versao_id', v_v2), true, v_troca::timestamptz + interval '9 hours'),
      (v_aluno, v_treinador, 'decisao', 'Semana da gripe',
       'Semana 3 com 1 de 4 treinos por gripe. Na volta, cargas 1 degrau abaixo por uma semana.',
       '{}', false, (v_inicio + 21)::timestamptz + interval '8 hours');
  end if;

  raise notice 'Aluno de teste criado: % sessões.', (select count(*) from training_sessions where aluno_id = v_aluno);
end $$;
