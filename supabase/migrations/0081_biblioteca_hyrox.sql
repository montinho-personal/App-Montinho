-- ============================================================================
-- 0081 — Biblioteca: exercícios de Hyrox da ficha da Ana Santos (Operação
-- Dublin Hybrid Queen, 23/10/2026). A Caminhada do fazendeiro já existia.
-- Os de condicionamento (trenó, corda naval, remo) são por TEMPO e não contam
-- volume de musculação, como a Caminhada do fazendeiro; ficam fora da regra
-- “até a falha”. O thruster conta volume (agachamento + desenvolvimento).
-- Sem vídeo ainda. Idempotente.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, video_validado)
values
(
  '5d2a7c41-8e3b-4f19-a6d2-0c9e1b7f3a51', 'Empurrar o trenó (sled push)', 'sled-push', 'quadriceps', '{gluteo,panturrilha}', '{outro}',
  array['Mãos no alto das barras do trenó, braços estendidos e tronco inclinado à frente.', 'Empurre com passos curtos e rápidos, apoiando a frente do pé e estendendo bem cada perna.', 'Mantenha o abdômen firme e as costas retas até o fim do tempo ou da distância.'],
  array['sled push', 'empurrar trenó', 'trenó', 'push sled', 'empurrada de trenó'],
  'manual', 'carregamento', array['quadril', 'joelho', 'tornozelo'], 'multiarticular',
  array['Quadril alto demais, tirando a força das pernas.', 'Passos longos e lentos.', 'Lombar arredondada.'],
  array['carga', 'tempo', 'distancia'], '{"gluteo":0.5,"panturrilha":0.25}'::jsonb, array['joelho'], 'iniciante', false, 'treinador',
  null, null, false
),
(
  '8b6e0f92-3c47-4d1a-9e25-71a4c8d0b2e6', 'Puxar o trenó (sled pull)', 'sled-pull', 'costas', '{biceps,posteriores,antebraco}', '{corda,outro}',
  array['De frente para o trenó, corda nas mãos, joelhos semiflexionados e quadril para trás.', 'Puxe a corda mão após mão, trazendo o trenó até você, usando costas e pernas.', 'Caminhe para trás quando a corda acabar e repita até o fim do tempo ou da distância.'],
  array['sled pull', 'puxar trenó', 'puxada de trenó', 'trenó com corda'],
  'manual', 'carregamento', array['ombro', 'cotovelo', 'quadril'], 'multiarticular',
  array['Puxar só com os braços.', 'Ficar em pé com as pernas estendidas.', 'Arredondar a lombar.'],
  array['carga', 'tempo', 'distancia'], '{"biceps":0.5,"posteriores":0.25,"antebraco":0.25}'::jsonb, array['lombar'], 'iniciante', false, 'treinador',
  null, null, false
),
(
  '2f9c4a16-d73e-4b85-8a0f-3e6b2d91c7a4', 'Corda naval (battle rope)', 'corda-naval', 'cardio', '{ombros,core}', '{corda}',
  array['Uma ponta da corda em cada mão, joelhos semiflexionados e abdômen firme.', 'Faça ondas alternando os braços, rápidas e contínuas, sem parar o ritmo.', 'Mantenha o tronco estável até o fim do tempo.'],
  array['battle rope', 'corda naval', 'corda ondulatória', 'ondas com corda'],
  'manual', null, array['ombro', 'cotovelo'], 'multiarticular',
  array['Ondas pequenas que não chegam ao fim da corda.', 'Tronco balançando.', 'Prender a respiração.'],
  array['tempo'], '{"ombros":0.5,"core":0.25}'::jsonb, array['ombro'], 'iniciante', false, 'treinador',
  null, null, false
),
(
  '6a1d8e53-0b29-4c7f-b4e1-9d5f2a8c6b30', 'Remo ergômetro (rower)', 'remo-ergometro', 'cardio', '{costas,quadriceps}', '{outro}',
  array['Pés presos, canelas na vertical e braços estendidos segurando o puxador.', 'Empurre com as pernas, depois incline levemente o tronco para trás e puxe o puxador até a base do peito.', 'Volte na ordem inversa: braços, tronco e pernas.'],
  array['rower', 'remo seco', 'remo ergômetro', 'remo no ergômetro', 'row erg', 'concept2'],
  'manual', null, array['quadril', 'joelho', 'ombro'], 'multiarticular',
  array['Puxar com os braços antes de empurrar com as pernas.', 'Lombar arredondada.', 'Voltar dobrando os joelhos antes de estender os braços.'],
  array['tempo', 'distancia'], '{"costas":0.5,"quadriceps":0.5}'::jsonb, array['lombar'], 'iniciante', false, 'treinador',
  null, null, false
),
(
  '9e4b7d20-a51c-4f63-8d97-2b0c6e3a1f85', 'Thruster', 'thruster', 'quadriceps', '{gluteo,ombro_anterior,triceps}', '{halter,barra,kettlebell,outro}',
  array['Peso apoiado na altura dos ombros, pés na largura do quadril.', 'Agache até a coxa ficar paralela ao chão, mantendo o peito aberto.', 'Suba explodindo e, no mesmo movimento, empurre o peso acima da cabeça até estender os braços.'],
  array['thruster', 'thrusters', 'agachamento com desenvolvimento', 'ram thrusters', 'thruster com halteres'],
  'manual', 'agachar', array['quadril', 'joelho', 'ombro', 'cotovelo'], 'multiarticular',
  array['Parar entre o agachamento e o desenvolvimento.', 'Cotovelos baixos e peso caindo à frente.', 'Joelhos indo para dentro.'],
  array['carga', 'repeticoes'], '{"gluteo":0.5,"ombro_anterior":0.5,"triceps":0.25}'::jsonb, array['joelho', 'ombro'], 'intermediario', true, 'treinador',
  null, null, false
)
on conflict (slug) do nothing;
