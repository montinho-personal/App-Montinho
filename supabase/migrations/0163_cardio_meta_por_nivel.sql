-- 0163 — Troféus de META do cardio valem de novo a cada intensificação (pedido do Montinho,
-- 18/11/2026: “botão para intensificação de cardio… os troféus voltam para a nova meta,
-- começa a valer todos novamente”). Semana no Ritmo (cardio_semana_ritmo), 100% no Plano
-- (cardio_meta_semana), Fôlego de Ferro (cardio_4_semanas) e Uma Hora de Chalalá
-- (cardio_uma_hora): o app grava o nível 1 com referência '1' (como já estava) e cada meta
-- nova (maior que todas as anteriores) com 'nivel:<segunda>' (src/lib/cardio/regras.ts#niveisDoCardio).
-- Aqui: as funções do ranking contam esses 4 códigos por referência, como o Dobro (0159). Idempotente.
do $$
declare
  f text;
  def text;
  novo text;
begin
  foreach f in array array['ranking_trofeus_v2', 'ranking_trofeus_v3', 'ranking_lider_publico', 'montinho_no_ranking', 'conceder_passou_montinho', 'ranking_perfil'] loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = f;
    if def is null or position($x$'cardio_semana_ritmo', 'cardio_meta_semana'$x$ in def) > 0 then continue; end if;
    novo := replace(def, $a$or c.codigo in ('compartilhou_primeiro', 'cardio_folego_extra', 'cardio_dobro', 'cardio_triplo') then$a$, $b$or c.codigo in ('compartilhou_primeiro', 'cardio_folego_extra', 'cardio_dobro', 'cardio_triplo', 'cardio_semana_ritmo', 'cardio_meta_semana', 'cardio_4_semanas', 'cardio_uma_hora') then$b$);
    if novo <> def then execute novo; end if;
  end loop;
end $$;
