-- ============================================================================
-- 0109 — Lote de vídeos enviados pelo personal em 28/10/2026 (YouTube Shorts,
-- validados por ele): extensora unilateral, militar em pé, Smith, lateral na polia, ponte de glúteo, elevação pélvica unilateral, flexão de braços, levantamento terra barra reta (renomeado) e remada na máquina articulada (pegada pronada). Idempotente.
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
