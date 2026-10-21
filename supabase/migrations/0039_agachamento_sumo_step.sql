-- ============================================================================
-- 0039 — Biblioteca: “Agachamento sumô com halteres no step” (pedido do
-- personal), com o vídeo que ele enviou (YouTube, já validado por ele).
-- Principal: glúteo. Secundários (volume ponderado): quadríceps 0,5 e
-- adutores 0,5 — mesmo critério do agachamento sumô do catálogo.
-- Idempotente: pode rodar de novo sem duplicar.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, video_validado)
values (
  '89a436c6-ce10-4f40-9d68-214598645311', 'Agachamento sumô com halteres no step', 'agachamento-sumo-halteres-step', 'gluteo', '{quadriceps,adutores}', '{halter}',
  array['Um pé em cada step, bem afastados e com as pontas para fora; halter seguro entre as pernas.', 'Desça entre os steps levando os joelhos na direção dos pés, o mais fundo que conseguir com a coluna firme.', 'Suba empurrando o chão e contraindo os glúteos no final.'],
  array['agachamento sumô no step', 'sumô no step', 'agachamento sumô com déficit', 'sumô com déficit', 'agachamento sumô halter step', 'sumo squat step', 'deficit sumo squat'],
  'manual', 'agachar', array['quadril', 'joelho', 'tornozelo'], 'multiarticular',
  array['Joelhos para dentro.', 'Arredondar as costas no fundo.', 'Steps instáveis ou afastados demais.'],
  array['carga', 'repeticoes'], '{"quadriceps": 0.5, "adutores": 0.5}'::jsonb, array['joelho', 'quadril'], 'intermediario', true, 'treinador',
  'youtube', 'yXOm6mak7gQ', true
)
on conflict (slug) do nothing;
