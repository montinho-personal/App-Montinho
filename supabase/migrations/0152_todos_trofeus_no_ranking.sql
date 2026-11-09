-- 0152 — Pedido do Montinho (09/11/2026): TODOS os troféus contam no ranking
-- (recorde, Eu voltei, Voltei a Respirar, A Volta por Cima, Desafio concluído,
-- Topo Firme/Inabalável/Lenda do Topo, 500/1.000 cardios quando ligarem…),
-- 1 vez cada código. Só a Multimodalidade continua fora (quem não faz WOD/HYROX
-- não sai em desvantagem); o Atleta Versátil conta. Espelho: FORA_DO_RANKING
-- em src/lib/ranking/trofeus.ts.
-- Troca a lista de exceções nas funções que contam troféus, sem mudar mais nada.
do $$
declare
  f text;
  def text;
  novo text;
begin
  foreach f in array array['ranking_trofeus', 'ranking_trofeus_v2', 'ranking_trofeus_v3', 'ranking_lider_publico', 'montinho_no_ranking', 'conceder_passou_montinho'] loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = f;
    if def is null then continue; end if;
    novo := regexp_replace(def,
      $re$'recorde',\s*'eu_voltei',\s*'desafio_concluido',\s*'cardio_voltei',\s*'cardio_500',\s*'cardio_1000',\s*'retomada_30',\s*('primeiro_wod',\s*'primeiro_benchmark',\s*'superando_recorde',\s*'primeira_hyrox',\s*'primeiro_funcional',\s*'semana_multimodalidade',\s*'evolucao_sem_fronteiras')(,\s*'topo_ranking',\s*'topo_5_dias',\s*'topo_10_dias',\s*'topo_30_dias')?$re$,
      '\1', 'g');
    if novo <> def then execute novo; end if;
  end loop;
end $$;
