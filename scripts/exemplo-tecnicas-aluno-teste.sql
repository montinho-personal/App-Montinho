-- ============================================================================
-- Exemplo: técnicas avançadas no treino do aluno fictício "Lucas Andrade (teste)".
-- Cole no Supabase → SQL Editor → Run. Pode rodar mais de uma vez (só aplica uma).
-- Cria a VERSÃO 3 do plano; as versões 1 e 2 continuam no histórico.
--   A: Tríceps corda — drop set (2 drops na última série)
--      Rosca direta W — rest-pause (2 mini-séries na última série)
--   B: Leg press 45° — drop set (1 drop na última série)
--      Panturrilha em pé — myo-reps (3 mini-séries em todas)
--   C: Elevação lateral — myo-reps (4 mini-séries em 2 séries)
--      Rosca martelo + Tríceps francês — superset (bloco S1)
--   D: Levantamento terra — cluster
--      Cadeira extensora — drop set (2 drops na última série)
-- ============================================================================
do $$
declare v_aluno uuid := 'a0000000-0000-4000-8000-000000000002';
        v_prog uuid := 'a0000000-0000-4000-8000-000000000003';
        v_autor uuid;
begin
  if exists (select 1 from programa_versoes where programa_id = v_prog and versao = 3) then
    raise notice 'Exemplo já aplicado (versão 3 existe).';
    return;
  end if;
  select id into v_autor from profiles where email = 'blink.renato@gmail.com';

  update exercicios set tecnica = 'dropset', tecnica_extras = 2, tecnica_series = 1,
         observacoes = 'Última série: ao falhar, reduza ~20% da carga e continue sem descanso; reduza mais 1 vez.'
   where id = '6484b895-c553-4297-b680-f99e81a57b01';
  update exercicios set tecnica = 'rest_pause', tecnica_extras = 2, tecnica_series = 1,
         observacoes = 'Última série: ao falhar, pause 15 s e faça mais reps; repita mais 1 vez.'
   where id = '78665693-65c2-4d30-955d-a8ad68c23efe';
  update exercicios set tecnica = 'dropset', tecnica_extras = 1, tecnica_series = 1 where id = 'e2ea37ac-8c7c-4579-9834-16e5775cd94e';
  update exercicios set tecnica = 'myo_reps', tecnica_extras = 3 where id = '4b2c2464-8225-43dc-b72d-31eb677996ae';
  update exercicios set tecnica = 'myo_reps', tecnica_extras = 4, tecnica_series = 2 where id = '413964d6-bd5e-4d8f-b4d1-13c982e377b6';
  update exercicios set tecnica = 'superset', bloco = 'S1'
   where id in ('146837aa-1f25-442e-b680-4c1b380b20cb', 'bdff0b2d-899c-4b74-a7e4-a808ed4b3e4a');
  update exercicios set tecnica = 'cluster' where id = 'eb9d613d-a239-4e72-8bb4-8d611cc20652';
  update exercicios set tecnica = 'dropset', tecnica_extras = 2, tecnica_series = 1 where id = '799d4f0f-ee0a-49d2-8fc6-baebf630b148';

  update programas set versao = 3, updated_at = now() where id = v_prog;
  insert into programa_versoes (aluno_id, programa_id, versao, autor_id, motivo, snapshot, diff_resumo, created_at)
  values (v_aluno, v_prog, 3, v_autor, 'Exemplo: técnicas avançadas (drop set, rest-pause, myo-reps, superset, cluster)',
    jsonb_build_object('programa', jsonb_build_object('nome', 'Bloco 1 — Upper/Lower 4x', 'split', 'Upper/Lower'),
      'treinos', (select jsonb_agg(jsonb_build_object('letra', t.letra, 'nome', t.nome, 'exercicios',
         (select jsonb_agg(jsonb_build_object('nome', e.nome, 'series', e.series, 'reps', e.reps, 'grupo', e.grupo_muscular,
                   'series_aquecimento', e.series_aquecimento, 'tecnica', e.tecnica, 'tecnica_extras', e.tecnica_extras,
                   'tecnica_series', e.tecnica_series, 'bloco', e.bloco) order by e.ordem)
            from exercicios e where e.treino_id = t.id and e.removido_em is null)) order by t.letra)
         from treinos t where t.aluno_id = v_aluno and t.ativo)),
    'Técnicas em 9 exercícios; séries e exercícios iguais', now());
  raise notice 'Exemplo aplicado: versão 3 criada.';
end $$;
