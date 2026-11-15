-- 0160 — Troféu “Triplo de Fôlego” (cardio_triplo; pedido do Montinho, 15/11/2026):
-- o triplo dos minutos de cardio prescritos na semana. Como o Dobro (0159), vale
-- DE NOVO a cada semana (referência 'semana:<segunda>') e cada semana conta no
-- ranking. Regras no app: src/lib/cardio/regras.ts (LIMITES_CARDIO.extra300).
-- Parte 1: aceita o código (acrescenta à lista atual, sem reescrevê-la).
-- Parte 2: as funções do ranking contam cardio_triplo por referência. Idempotente.
do $$
declare
  def text;
  novo text;
  f text;
begin
  select pg_get_constraintdef(oid) into def from pg_constraint where conname = 'conquistas_aluno_codigo_check';
  if def is not null and position('cardio_triplo' in def) = 0 then
    novo := replace(def, $a$'cardio_dobro'::text$a$, $b$'cardio_dobro'::text, 'cardio_triplo'::text$b$);
    if novo = def then raise exception '0160: não achei cardio_dobro na lista de códigos'; end if;
    execute 'alter table conquistas_aluno drop constraint conquistas_aluno_codigo_check';
    execute 'alter table conquistas_aluno add constraint conquistas_aluno_codigo_check ' || novo;
  end if;

  foreach f in array array['ranking_trofeus_v2', 'ranking_trofeus_v3', 'ranking_lider_publico', 'montinho_no_ranking', 'conceder_passou_montinho', 'ranking_perfil'] loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = f;
    if def is null or position('cardio_triplo' in def) > 0 then continue; end if;
    novo := replace(def, $a$or c.codigo = 'cardio_dobro' then$a$, $b$or c.codigo in ('cardio_dobro', 'cardio_triplo') then$b$);
    if novo <> def then execute novo; end if;
  end loop;
end $$;
