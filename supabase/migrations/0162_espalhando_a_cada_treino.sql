-- 0162 — “Espalhando o Chalalá” (compartilhou_primeiro) vale DE NOVO a cada SEMANA
-- com pelo menos 1 card compartilhado (ou baixado), e cada semana conta no ranking
-- (pedido do Montinho, 15/11/2026: “incentivar os alunos sempre a compartilhar um
-- card… deixa apenas 1 por semana”). O app grava o 1º com referência '1' (como já
-- estava) e as semanas seguintes com 'semana:<segunda>'
-- (src/lib/conquistas/compartilhar.ts#semanasComCardCompartilhado). Aqui: as funções
-- do ranking contam compartilhou_primeiro por referência. Idempotente.
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
    if def is null or position($x$'compartilhou_primeiro', 'cardio_folego_extra'$x$ in def) > 0 then continue; end if;
    novo := replace(def, $a$or c.codigo in ('cardio_folego_extra', 'cardio_dobro', 'cardio_triplo') then$a$, $b$or c.codigo in ('compartilhou_primeiro', 'cardio_folego_extra', 'cardio_dobro', 'cardio_triplo') then$b$);
    if novo <> def then execute novo; end if;
  end loop;
end $$;
