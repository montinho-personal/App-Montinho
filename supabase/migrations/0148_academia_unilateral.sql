-- 0148 — Academia da Tribo: exercício unilateral conta os dois lados (pedido do Montinho, 05/11/2026).
-- No app, 1 série de um exercício unilateral é anotada uma vez e feita dos dois lados
-- (“faz o braço direito, depois o esquerdo”). Espelho de ehUnilateral/kgDaSessao em src/lib/academia/regras.ts.
-- Depois recalcula os treinos que já entraram na obra ativa (cada mudança fica no obra_historico como “treino corrigido”).

create or replace function public.obra_kg_sessao(p_session uuid)
returns table (kg numeric, conferir integer)
language sql stable security definer set search_path = public as $$
  with s as (select ts.id, ts.aluno_id from training_sessions ts where ts.id = p_session),
  pref as (select pc.anilhas, pc.halteres from s left join preferencias_carga pc on pc.aluno_id = s.aluno_id),
  linhas as (
    select st.id, st.carga_kg, st.reps, st.blocos,
           coalesce(eb.equipamento::text[], '{}'::text[]) as eq,
           translate(lower(coalesce(eb.nome, se.nome, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') as nome,
           coalesce(se.prescricao ->> 'unilateral', '') = 'true' as uni,
           exists (select 1 from obra_liberacoes l where l.set_id = st.id) as liberada
      from session_sets st
      join session_exercises se on se.id = st.session_exercise_id
      left join exercicios_biblioteca eb on eb.id = se.biblioteca_id
     where st.session_id = p_session and st.tipo <> 'aquecimento'
  ),
  tipo as (
    select l.*,
           case
             when 'halter' = any(l.eq) then case when l.uni or l.nome ~ '(unilateral|goblet|frances|serrote|pull ?over|um halter|1 halter)' then null else 'halteres' end
             when l.eq && array['barra','barra_w','smith','anilha']::text[] or l.nome ~ '(leg ?press 45|hack)' then 'anilhas'
           end as tipo_peso
      from linhas l
  ),
  bruto as (
    select t.*,
           case when t.blocos is not null and jsonb_typeof(t.blocos) = 'array' and jsonb_array_length(t.blocos) > 0
                then (select coalesce(sum(coalesce(nullif(b ->> 'carga', '')::numeric, t.carga_kg, 0) * coalesce(nullif(b ->> 'reps', '')::numeric, 0)), 0)
                        from jsonb_array_elements(t.blocos) b)
                else coalesce(t.carga_kg, 0) * coalesce(t.reps, 0) end as kg_serie,
           (coalesce(t.carga_kg, 0) > 500 or coalesce(t.reps, 0) > 100) and not t.liberada as fora
      from tipo t
  )
  select coalesce(sum(case when b.fora or b.kg_serie <= 0 then 0
                           else b.kg_serie * case when (b.tipo_peso = 'anilhas' and (select anilhas from pref) = 'por_lado')
                                                    or (b.tipo_peso = 'halteres' and (select halteres from pref) = 'por_lado') then 2 else 1 end
                                           * case when b.uni or b.nome ~ '(unilateral|serrote|concentrad|bulgar)' then 2 else 1 end end), 0)::numeric,
         count(*) filter (where b.fora)::int
    from bruto b;
$$;
revoke all on function public.obra_kg_sessao(uuid) from public, anon, authenticated;

do $$
declare r record;
begin
  for r in select c.session_id from obra_contribuicoes c join obras o on o.id = c.obra_id where o.estado = 'ativa' loop
    perform public.obra_registrar_interno(r.session_id);
  end loop;
end $$;
