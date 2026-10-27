-- ============================================================================
-- 0110 — Trocas aprovadas pelo personal (28/10/2026) no “⇄ Trocar exercício”,
-- nos dois sentidos (e o desenvolvimento no Smith ⇄ halteres sentado ⇄ máquina);
-- landmine e terra romeno arquivados na biblioteca. Remadas:
--   • Remada na máquina articulada (pegada pronada) ⇄ Remada sentada pegada aberta
--   • Remada na máquina articulada (pegada neutra)  ⇄ Remada sentada na polia (triângulo)
-- Só equivalências; nenhum treino muda. Idempotente.
-- ============================================================================
insert into exercicio_equivalencias (exercicio_id, alternativa_id, origem, status)
select a.id, b.id, 'treinador', 'aprovada'
from (values
  ('remada-maquina-articulada', 'remada-baixa-aberta'),
  ('remada-baixa-aberta', 'remada-maquina-articulada'),
  ('remada-maquina-articulada-neutra', 'remada-baixa-triangulo'),
  ('remada-baixa-triangulo', 'remada-maquina-articulada-neutra')
) v(de, para)
join exercicios_biblioteca a on a.slug = v.de
join exercicios_biblioteca b on b.slug = v.para
on conflict (exercicio_id, alternativa_id) do update set status = 'aprovada', origem = 'treinador';

-- Desenvolvimento no Smith (“barra guiada”) ⇄ com halteres sentado ⇄ na
-- máquina: todos trocam entre si, aprovados pelo personal (28/10/2026).
insert into exercicio_equivalencias (exercicio_id, alternativa_id, origem, status)
select a.id, b.id, 'treinador', 'aprovada'
from (values
  ('desenvolvimento-smith', 'desenvolvimento-halteres-sentado'),
  ('desenvolvimento-halteres-sentado', 'desenvolvimento-smith'),
  ('desenvolvimento-smith', 'desenvolvimento-maquina'),
  ('desenvolvimento-maquina', 'desenvolvimento-smith'),
  ('desenvolvimento-halteres-sentado', 'desenvolvimento-maquina'),
  ('desenvolvimento-maquina', 'desenvolvimento-halteres-sentado')
) v(de, para)
join exercicios_biblioteca a on a.slug = v.de
join exercicios_biblioteca b on b.slug = v.para
on conflict (exercicio_id, alternativa_id) do update set status = 'aprovada', origem = 'treinador';

-- Saem da biblioteca (pedido do personal: ficar só com os que têm o vídeo
-- dele): “Desenvolvimento na barra guiada (landmine)” e “Levantamento terra
-- romeno”. Arquivados, não apagados: fichas e histórico continuam.
update exercicios_biblioteca set arquivado = true
where slug in ('landmine-press', 'terra-romeno') and not arquivado;
