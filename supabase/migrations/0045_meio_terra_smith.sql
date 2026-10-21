-- ============================================================================
-- 0045 — Biblioteca: “Meio terra no Smith” (pedido do personal), com o vídeo
-- que ele enviou (YouTube, já validado por ele).
-- Meio terra = levantamento terra parcial (a barra desce só até a altura do
-- joelho / meio da canela). Com pouca flexão de joelho, o trabalho fica na
-- extensão do quadril e na sustentação da coluna (consenso de treinadores
-- sobre rack pull / terra parcial; não há estudo de EMG específico).
-- Principal: glúteo. Secundários (volume ponderado): posteriores de coxa 0,5,
-- lombar 0,5 (mesmo peso do terra convencional), trapézio 0,25, costas 0,25
-- e antebraço 0,25 (pegada). Quadríceps fica de fora (joelho quase não flexiona).
-- Idempotente: pode rodar de novo sem duplicar.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, video_validado)
values (
  'f2cdfa68-bf01-4940-a8bb-d9fe0bb75d91', 'Meio terra no Smith', 'meio-terra-smith', 'gluteo', '{posteriores,lombar,trapezio,costas,antebraco}', '{smith}',
  array['Barra do Smith rente às coxas, pés na largura do quadril, joelhos levemente flexionados.', 'Desça a barra até a altura do joelho ou meio da canela, empurrando o quadril para trás com a coluna neutra.', 'Suba empurrando o chão e contraindo os glúteos até ficar em pé, sem inclinar o tronco para trás.'],
  array['meio terra', 'meio-terra', 'meio terra smith', 'terra no smith', 'terra parcial', 'levantamento terra parcial', 'rack pull', 'rack pull smith', 'half deadlift', 'smith deadlift'],
  'manual', 'dobradica_quadril', array['quadril', 'coluna'], 'multiarticular',
  array['Arredondar a lombar na descida.', 'Afastar a barra das pernas.', 'Hiperestender a coluna no topo.'],
  array['carga', 'repeticoes'], '{"posteriores": 0.5, "lombar": 0.5, "trapezio": 0.25, "costas": 0.25, "antebraco": 0.25}'::jsonb, array['lombar'], 'intermediario', true, 'treinador',
  'youtube', 'nE-UsMYAb4Y', true
)
on conflict (slug) do nothing;
