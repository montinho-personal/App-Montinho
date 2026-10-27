-- ============================================================================
-- 0109 — Lote de vídeos enviados pelo personal em 28/10/2026 (YouTube Shorts,
-- validados por ele): extensora unilateral, militar em pé, Smith, lateral na polia, ponte de glúteo, elevação pélvica unilateral, flexão de braços, levantamento terra barra reta (renomeado), remada na máquina articulada (pegada pronada), remada alta com barra (renomeada) + novos: remada alta no cross e remada na máquina articulada (pegada neutra). Idempotente.
-- ============================================================================
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'FyrO55GJtz4',
    thumbnail_url = 'https://i.ytimg.com/vi/FyrO55GJtz4/hqdefault.jpg', video_validado = true
where slug = 'cadeira-extensora-unilateral' and video_id is distinct from 'FyrO55GJtz4';

-- Vídeo do “Desenvolvimento militar em pé” (YouTube Shorts enviado pelo personal
-- em 28/10/2026, validado por ele).
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'F1NZ3MoNCvU',
    thumbnail_url = 'https://i.ytimg.com/vi/F1NZ3MoNCvU/hqdefault.jpg', video_validado = true
where slug = 'desenvolvimento-barra-em-pe' and video_id is distinct from 'F1NZ3MoNCvU';

-- Vídeo do “Desenvolvimento no Smith” (o personal chama de “desenvolvimento na
-- barra guiada”; confirmado por ele em 28/10/2026 que é o do Smith, não o
-- landmine) + esse nome como sinônimo, para a busca achar.
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'm1dtZHPSmHg',
    thumbnail_url = 'https://i.ytimg.com/vi/m1dtZHPSmHg/hqdefault.jpg', video_validado = true
where slug = 'desenvolvimento-smith' and video_id is distinct from 'm1dtZHPSmHg';
update exercicios_biblioteca
set sinonimos = array_append(sinonimos, 'desenvolvimento na barra guiada')
where slug = 'desenvolvimento-smith' and not ('desenvolvimento na barra guiada' = any(sinonimos));

-- Vídeo da “Elevação lateral na polia” (YouTube Shorts enviado pelo personal
-- em 28/10/2026, validado por ele).
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'YM7_fkB7384',
    thumbnail_url = 'https://i.ytimg.com/vi/YM7_fkB7384/hqdefault.jpg', video_validado = true
where slug = 'elevacao-lateral-polia' and video_id is distinct from 'YM7_fkB7384';

-- Vídeo da “Elevação pélvica no solo (ponte de glúteo)” (YouTube Shorts enviado
-- pelo personal em 28/10/2026, validado por ele).
update exercicios_biblioteca
set video_provider = 'youtube', video_id = '1satDE63Bwc',
    thumbnail_url = 'https://i.ytimg.com/vi/1satDE63Bwc/hqdefault.jpg', video_validado = true
where slug = 'elevacao-pelvica-solo' and video_id is distinct from '1satDE63Bwc';

-- Vídeo da “Elevação pélvica unilateral” (YouTube Shorts enviado pelo personal
-- em 28/10/2026, validado por ele).
update exercicios_biblioteca
set video_provider = 'youtube', video_id = '0e1SXFq806U',
    thumbnail_url = 'https://i.ytimg.com/vi/0e1SXFq806U/hqdefault.jpg', video_validado = true
where slug = 'elevacao-pelvica-unilateral' and video_id is distinct from '0e1SXFq806U';

-- Vídeo da “Flexão de braços” (YouTube Shorts enviado pelo personal em
-- 28/10/2026, validado por ele).
update exercicios_biblioteca
set video_provider = 'youtube', video_id = 'oKt99YZOjGU',
    thumbnail_url = 'https://i.ytimg.com/vi/oKt99YZOjGU/hqdefault.jpg', video_validado = true
where slug = 'flexao-de-bracos' and video_id is distinct from 'oKt99YZOjGU';

-- “Levantamento terra” passa a se chamar “Levantamento terra barra reta” (pedido
-- do personal em 28/10/2026), com o vídeo dele. O nome antigo vira sinônimo,
-- para a busca continuar achando. Nenhuma ficha usava este exercício.
update exercicios_biblioteca
set nome = 'Levantamento terra barra reta',
    sinonimos = case when 'levantamento terra' = any(sinonimos) then sinonimos else array_append(sinonimos, 'levantamento terra') end,
    video_provider = 'youtube', video_id = 'H1qG2ed4WTY',
    thumbnail_url = 'https://i.ytimg.com/vi/H1qG2ed4WTY/hqdefault.jpg', video_validado = true
where slug = 'levantamento-terra' and (nome <> 'Levantamento terra barra reta' or video_id is distinct from 'H1qG2ed4WTY');

-- Remada na máquina articulada (pegada pronada): vídeo + sinônimos da pegada.
update exercicios_biblioteca
set sinonimos = (
      select array_agg(distinct s) from unnest(sinonimos || array['remada máquina articulada pegada pronada', 'remada articulada pronada']) s
    ),
    video_provider = 'youtube', video_id = 'IH1pjEOUQuI',
    thumbnail_url = 'https://i.ytimg.com/vi/IH1pjEOUQuI/hqdefault.jpg', video_validado = true
where slug = 'remada-maquina-articulada' and video_id is distinct from 'IH1pjEOUQuI';

-- Remada alta com barra: nome claro + vídeo (a do cross virou exercício próprio).
update exercicios_biblioteca
set nome = 'Remada alta com barra',
    sinonimos = (select array_agg(distinct s) from unnest(array_remove(sinonimos, 'remada alta polia') || array['remada alta', 'remada alta com barra']) s),
    equipamento = '{barra}',
    video_provider = 'youtube', video_id = 'tpK50gsZRyU',
    thumbnail_url = 'https://i.ytimg.com/vi/tpK50gsZRyU/hqdefault.jpg', video_validado = true
where slug = 'remada-alta' and (nome <> 'Remada alta com barra' or video_id is distinct from 'tpK50gsZRyU');

-- Remada alta no cross (exercício novo, cadastro do personal): mesma
-- classificação da remada alta com barra, na polia.
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, thumbnail_url, video_validado)
select 'd4f41a41-ff6d-4622-b1fa-a255c38151e1', 'Remada alta no cross', 'remada-alta-cross', grupo_muscular, grupos_secundarios, '{polia}',
  array['Barra reta ou corda na polia baixa do cross, pegada um pouco mais aberta que os ombros.', 'Puxe até a parte baixa do peito com os cotovelos à frente.', 'Desça controlando, sem deixar o peso bater.'],
  array['remada alta no cross', 'remada alta polia', 'remada alta no cabo', 'remada alta na polia'],
  'manual', padrao_movimento, articulacoes, tipo_movimento,
  array['Pegada muito fechada.', 'Subir os cotovelos acima dos ombros com dor.', 'Impulso do quadril.'],
  campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, 'treinador',
  'youtube', 'oA7Eg3xVyAk', 'https://i.ytimg.com/vi/oA7Eg3xVyAk/hqdefault.jpg', true
from exercicios_biblioteca where slug = 'remada-alta'
on conflict (slug) do update set video_provider = 'youtube', video_id = 'oA7Eg3xVyAk',
  thumbnail_url = 'https://i.ytimg.com/vi/oA7Eg3xVyAk/hqdefault.jpg', video_validado = true
  where exercicios_biblioteca.video_id is distinct from 'oA7Eg3xVyAk';

-- Remada na máquina articulada (pegada neutra) (exercício novo, cadastro do
-- personal): mesma classificação da remada na máquina articulada.
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, thumbnail_url, video_validado)
select 'd13bcddc-befe-436a-9743-e88398d2a8e8', 'Remada na máquina articulada (pegada neutra)', 'remada-maquina-articulada-neutra', grupo_muscular, grupos_secundarios, equipamento,
  array['Peito apoiado no encosto e pés firmes.', 'Segure as pegadas com as palmas viradas uma para a outra.', 'Puxe levando os cotovelos para trás, junto ao corpo, e volte alongando as costas.'],
  array['remada máquina neutra', 'remada articulada neutra', 'remada máquina articulada pegada neutra', 'remada neutra máquina'],
  'manual', padrao_movimento, articulacoes, tipo_movimento, erros_comuns,
  campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, 'treinador',
  'youtube', 'Sq7rWvJtzDY', 'https://i.ytimg.com/vi/Sq7rWvJtzDY/hqdefault.jpg', true
from exercicios_biblioteca where slug = 'remada-maquina-articulada'
on conflict (slug) do update set video_provider = 'youtube', video_id = 'Sq7rWvJtzDY',
  thumbnail_url = 'https://i.ytimg.com/vi/Sq7rWvJtzDY/hqdefault.jpg', video_validado = true
  where exercicios_biblioteca.video_id is distinct from 'Sq7rWvJtzDY';
