-- ============================================================================
-- 0083 — Exercícios de HYROX da ficha da Ana com o nome em inglês (pedido do
-- personal em 23/10/2026). O nome em português continua como sinônimo (a
-- busca acha dos dois jeitos). Nenhuma ficha usava esses exercícios ainda. Idempotente.
-- ============================================================================
update exercicios_biblioteca b
set nome = v.novo,
    sinonimos = array(select distinct unnest(b.sinonimos || array[lower(v.antigo)]))
from (values
  ('corda-naval', 'Battle Rope', 'Corda naval (battle rope)'),
  ('caminhada-fazendeiro', 'Farmers Carry', 'Caminhada do fazendeiro'),
  ('passada-andando', 'Walking Lunges', 'Passada andando'),
  ('sled-push', 'Sled Push', 'Empurrar o trenó (sled push)'),
  ('sled-pull', 'Sled Pull', 'Puxar o trenó (sled pull)'),
  ('remo-ergometro', 'Rower', 'Remo ergômetro (rower)'),
  ('thruster', 'Ram Thrusters', 'Thruster'),
  ('kettlebell-strict-press', 'Kettlebell Strict Press', 'Desenvolvimento com kettlebell (strict press)')
) as v(slug, novo, antigo)
where b.slug = v.slug and b.nome is distinct from v.novo;
