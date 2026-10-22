-- ============================================================================
-- 0060 — Pedido do personal (22/10/2026):
--  • Biblioteca: “Bom dia no hack” (good morning feito na máquina hack), com o
--    vídeo que ele enviou. Mesma classificação do good morning com barra:
--    principal posteriores; glúteo 0,5 e lombar 0,5. Equipamento: máquina.
--  • Ficha da Natália (treino C — Lower): o “Good morning” passa a ser o
--    “Bom dia no hack”, com esse nome, como o personal pediu. O exercício
--    ainda não tem histórico (nenhum treino registrado), então só troca o
--    nome e a referência da biblioteca; séries, reps e observação ficam.
--  • Vídeo da “Panturrilha no leg press 45°” (criada em 0056).
-- Idempotente.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, video_validado)
values (
  '5b1e8c3a-7d2f-4e6a-9b0c-2f4d6a8e1c60', 'Bom dia no hack', 'bom-dia-hack', 'posteriores', '{gluteo,lombar}', '{maquina}',
  array['Fique de frente para o encosto da hack, com os ombros nas almofadas e os joelhos levemente flexionados.', 'Incline o tronco à frente empurrando o quadril para trás, com a coluna neutra.', 'Volte contraindo glúteos e posteriores até ficar em pé.'],
  array['bom dia hack', 'good morning no hack', 'good morning hack', 'good morning na hack machine', 'bom dia na hack'],
  'manual', 'dobradica_quadril', array['quadril', 'coluna'], 'multiarticular',
  array['Arredondar a coluna.', 'Flexionar muito os joelhos (vira agachamento).', 'Carga alta cedo demais.'],
  array['carga', 'repeticoes'], '{"gluteo": 0.5, "lombar": 0.5}'::jsonb, array['lombar'], 'intermediario', true, 'treinador',
  'youtube', 'wtcr8Q2xbAs', true
)
on conflict (slug) do nothing;

update exercicios
   set nome = 'Bom dia no hack', biblioteca_id = '5b1e8c3a-7d2f-4e6a-9b0c-2f4d6a8e1c60'
 where id = '03bcf864-0a20-4967-931f-09232d74781f'
   and biblioteca_id = 'd76feef9-19ce-435c-ad2a-af5a7715bd25';

update exercicios_biblioteca
   set video_provider = 'youtube', video_id = 'erUNxqpFxkc', video_validado = true
 where slug = 'panturrilha-leg-press-45' and video_id is distinct from 'erUNxqpFxkc';
