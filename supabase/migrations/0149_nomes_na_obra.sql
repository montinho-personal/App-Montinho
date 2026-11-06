-- 0149 — Nomes na lista da Academia da Tribo (pedido do Montinho, 06/11/2026: “como está aparecendo meu nome?”).
-- 1) nome_curto ignora o que está entre parênteses (“Carol Zorzi (Carolina)” saía “Carol (.”; agora “Carol Z.”),
--    igual ao espelho nomeCurto de src/lib/data/desafios.ts. Vale para ranking, desafios e obra.
-- 2) Na lista “Quem está construindo”, a ficha do PERSONAL aparece com o nome dele (“Montinho”),
--    mesmo fora do ranking — antes virava “Atleta da Tribo” para os alunos.
create or replace function public.nome_curto(p_nome text) returns text language sql immutable set search_path = public as $$
  with n as (select btrim(regexp_replace(coalesce(p_nome, ''), '\([^)]*\)', '', 'g')) as t),
  p as (select t, regexp_split_to_array(t, '\s+') as a from n)
  select case when t = '' then 'Aluno'
              when array_length(a, 1) = 1 then t
              else a[1] || ' ' || upper(left(a[array_length(a, 1)], 1)) || '.' end
    from p;
$$;

create or replace function public.obra_participantes_lista(p_obra uuid)
returns table (nome text, kg numeric, treinos integer, eu boolean)
language sql stable security definer set search_path = public as $$
  with o as (select * from obras where id = p_obra and (estado <> 'rascunho' or public.is_treinador()) and auth.uid() is not null),
  base as (
    select pa.aluno_id, pa.kg, pa.treinos from obra_participantes pa join o on o.id = pa.obra_id where o.estado = 'concluida'
    union all
    select c.aluno_id, sum(c.kg), count(*)::int from obra_contribuicoes c join o on o.id = c.obra_id
     where o.estado = 'ativa' and c.kg > 0 group by c.aluno_id
  )
  select case when public.is_treinador() then coalesce(p.nome, 'Aluno')
              when p.role = 'treinador' then coalesce(p.nome, 'Montinho')
              when b.aluno_id = public.aluno_id_atual() or coalesce(a.ranking_visivel, false) then public.nome_curto(p.nome)
              else 'Atleta da Tribo' end,
         case when public.is_treinador() or (select mostrar_contribuicoes from o) then round(b.kg) end,
         b.treinos,
         b.aluno_id = public.aluno_id_atual()
    from base b join alunos a on a.id = b.aluno_id left join profiles p on p.id = a.profile_id
   order by b.kg desc;
$$;
revoke all on function public.obra_participantes_lista(uuid) from public, anon;
grant execute on function public.obra_participantes_lista(uuid) to authenticated;
