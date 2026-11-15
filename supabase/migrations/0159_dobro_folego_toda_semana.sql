-- 0159 — “Dobro de Fôlego” (cardio_dobro) vale DE NOVO a cada semana com o dobro
-- dos minutos de cardio prescritos, e cada semana conta no ranking (pedido do
-- Montinho, 15/11/2026: “não é só na primeira, toda semana que conseguir”).
-- O app grava 1 por semana (a 1ª semana fica com referência '1', como já estava;
-- as outras, 'semana:<segunda-feira>'). Aqui: as funções que contam troféus passam
-- a contar cardio_dobro por referência, como os feriados (0158). Idempotente.
-- Espelho: contaCadaVez/chaveNoRanking em src/lib/ranking/trofeus.ts.
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
    if def is null or position('cardio_dobro' in def) > 0 then continue; end if;
    novo := replace(def, $a$when c.codigo like 'feriado\_%' then$a$, $b$when c.codigo like 'feriado\_%' or c.codigo = 'cardio_dobro' then$b$);
    if novo <> def then execute novo; end if;
  end loop;
end $$;
