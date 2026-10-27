-- ============================================================================
-- 0097 — Trocas aprovadas pelo personal (27/10/2026) para quando o aparelho
-- está ocupado (“⇄ Trocar exercício” no treino):
--   • Cadeira extensora → extensora unilateral (1ª, já aprovada) e leg press
--     horizontal (2ª). A ordem sai da pontuação: mesma articulação vem antes.
--   • Elevação lateral com halteres → polia e máquina (já aprovadas) + remada
--     alta (barra reta).
--   • Cadeira adutora → “Adução de quadril na polia baixa” (exercício novo,
--     cadastro do personal, sem vídeo ainda).
-- Só equivalências e biblioteca; nenhum treino muda. Idempotente.
-- ============================================================================
insert into exercicios_biblioteca (id, nome, slug, grupo_muscular, grupos_secundarios, equipamento, instrucoes, sinonimos, fonte_classificacao, padrao_movimento, articulacoes, tipo_movimento, erros_comuns, campos_registro, pesos_secundarios, estresse_articular, nivel_minimo, conta_volume, origem, video_provider, video_id, video_validado)
values (
  'aba99feb-8130-4613-a99b-833e7d27f2a0', 'Adução de quadril na polia baixa', 'aducao-polia-baixa', 'adutores', '{}', '{polia,caneleira}',
  array['Caneleira na polia baixa, de lado para a máquina, com a perna de trabalho mais perto da polia.', 'Traga a perna para dentro, cruzando à frente da perna de apoio.', 'Volte devagar, sem deixar o peso bater.'],
  array['adução na polia', 'adução na polia baixa', 'adutor na polia', 'cable hip adduction'],
  'manual', 'aducao_quadril', array['quadril'], 'monoarticular',
  array['Inclinar o tronco.', 'Impulso.', 'Retorno rápido.'],
  array['carga', 'repeticoes'], '{}'::jsonb, array['quadril'], 'iniciante', true, 'treinador',
  null, null, false
)
on conflict (slug) do nothing;

insert into exercicio_equivalencias (exercicio_id, alternativa_id, origem, status)
select a.id, b.id, 'treinador', 'aprovada'
from (values
  ('cadeira-extensora', 'cadeira-extensora-unilateral'),
  ('cadeira-extensora', 'leg-press-horizontal'),
  ('elevacao-lateral-halteres', 'elevacao-lateral-polia'),
  ('elevacao-lateral-halteres', 'elevacao-lateral-maquina'),
  ('elevacao-lateral-halteres', 'remada-alta'),
  ('cadeira-adutora', 'aducao-polia-baixa')
) v(de, para)
join exercicios_biblioteca a on a.slug = v.de
join exercicios_biblioteca b on b.slug = v.para
on conflict (exercicio_id, alternativa_id) do update set status = 'aprovada';
