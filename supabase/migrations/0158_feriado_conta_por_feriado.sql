-- 0158 — Troféus de feriado contam 1 vez POR FERIADO no ranking (pedido do
-- Montinho, 15/11/2026: “no outro feriado ela tem que ganhar novamente… deve
-- considerar outro troféu”). Os troféus já eram gravados a cada feriado
-- (referência '<feriado>:<ano>', 0121), mas o ranking contava 1 por código.
-- Agora: Finados Pago + Proclamação da República Pago = 2 troféus. Os outros
-- códigos continuam 1 vez cada. Espelho: chaveNoRanking em src/lib/ranking/trofeus.ts.
-- Troca só o agrupamento nas funções que contam troféus (idempotente) e faz o
-- perfil do ranking trazer 1 item por feriado, com o título (“Finados Pago”).
do $$
declare
  f text;
  def text;
  novo text;
begin
  foreach f in array array['ranking_trofeus_v2', 'ranking_trofeus_v3', 'ranking_lider_publico', 'montinho_no_ranking', 'conceder_passou_montinho'] loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = f;
    if def is null then continue; end if;
    novo := regexp_replace(def,
      'group by c\.aluno_id, c\.codigo(?!,)',
      'group by c.aluno_id, c.codigo, (case when c.codigo like ''feriado\_%'' then c.referencia end)', 'g');
    if novo <> def then execute novo; end if;
  end loop;

  select pg_get_functiondef(p.oid) into def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'ranking_perfil';
  if def is not null then
    novo := replace(def,
      $a$jsonb_build_object('codigo', k.codigo, 'em', k.em) order by k.em desc) from (select c.codigo, min(c.conquistado_em) as em from conquistas_aluno c where c.aluno_id = a.id group by c.codigo) k)$a$,
      $b$jsonb_build_object('codigo', k.codigo, 'em', k.em, 'referencia', k.ref, 'titulo', k.titulo) order by k.em desc) from (select c.codigo, (case when c.codigo like 'feriado\_%' then c.referencia end) as ref, min(c.titulo) as titulo, min(c.conquistado_em) as em from conquistas_aluno c where c.aluno_id = a.id group by c.codigo, 2) k)$b$);
    if novo <> def then execute novo; end if;
  end if;
end $$;
