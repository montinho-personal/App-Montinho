-- ============================================================================
-- 0110 — Trocas aprovadas pelo personal (28/10/2026) no “⇄ Trocar exercício”,
-- nos dois sentidos:
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
