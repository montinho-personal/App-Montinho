-- 0161 — “Fôlego Extra” (cardio_folego_extra, 150% dos minutos de cardio da semana)
-- vale DE NOVO a cada semana e cada semana conta no ranking, como o Dobro (0159) e o
-- Triplo (0160). Pedido do Montinho, 15/11/2026. O app grava 1 por semana (a 1ª
-- semana fica com referência '1'; as outras, 'semana:<segunda>'). Idempotente.
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
    if def is null or position($x$'cardio_folego_extra', 'cardio_dobro'$x$ in def) > 0 then continue; end if;
    novo := replace(def, $a$or c.codigo in ('cardio_dobro', 'cardio_triplo') then$a$, $b$or c.codigo in ('cardio_folego_extra', 'cardio_dobro', 'cardio_triplo') then$b$);
    if novo <> def then execute novo; end if;
  end loop;
end $$;
