-- ============================================================================
-- 0056 — Biblioteca: “Panturrilha no leg press 45°” (ficha da Natália,
-- “Panturrilha leg 45°”). A biblioteca só tinha a versão no leg press
-- horizontal (180°). Mesma classificação muscular dela (panturrilha, mesmos
-- pesos e campos); muda só o aparelho. Sem vídeo até o personal enviar.
-- Também: sinônimo “elevação frontal alternada” na elevação frontal com
-- halteres (o “alternada” é o jeito de executar, não outro exercício).
-- Idempotente.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, video_validado)
select '8f3c2d71-5a4e-4b9a-9c1d-6e2f7a8b0c45', 'Panturrilha no leg press 45°', 'panturrilha-leg-press-45', grupo_muscular, grupos_secundarios, equipamento,
  array['Sente no leg press 45° com a ponta dos pés na borda de baixo da plataforma e os joelhos quase estendidos.', 'Desça os calcanhares alongando a panturrilha, sem dobrar os joelhos.', 'Empurre a plataforma com a ponta dos pés até subir o máximo, segure um instante e desça devagar.'],
  array['panturrilha leg 45', 'panturrilha no leg 45', 'panturrilha leg press 45', 'gêmeos no leg 45', 'panturrilha no leg press 45º'],
  fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, 'treinador', null, null, false
from exercicios_biblioteca where slug = 'panturrilha-leg-press'
on conflict (slug) do nothing;

update exercicios_biblioteca
   set sinonimos = array_append(sinonimos, 'elevação frontal alternada')
 where nome = 'Elevação frontal com halteres' and not ('elevação frontal alternada' = any(sinonimos));
