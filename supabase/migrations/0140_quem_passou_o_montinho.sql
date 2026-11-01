-- ============================================================================
-- 0140 — “Quem já passou o Montinho” no Ranking (pedido do Montinho,
-- 01/11/2026: “deixar evidente no ranking quem passou o Montinho, uma
-- curiosidade para clicar e ver”). Lista quem tem o troféu `passou_montinho`
-- (0139), do primeiro a passar ao mais recente. Mesma regra de quem aparece no
-- ranking (`ranking_pode_ver`): o aluno vê só quem está visível no ranking e a
-- si mesmo, com primeiro nome + inicial; o personal vê todos com o nome
-- completo. Só leitura.
-- ============================================================================
create or replace function public.quem_passou_montinho()
returns table (ref uuid, nome text, em timestamptz, eu boolean)
language sql stable security definer set search_path = public as $$
  select a.id,
         case when public.is_treinador() then coalesce(nullif(btrim(p.nome), ''), 'Aluno') else public.nome_curto(p.nome) end,
         min(c.conquistado_em),
         a.id = public.aluno_id_atual()
    from conquistas_aluno c
    join alunos a on a.id = c.aluno_id
    left join profiles p on p.id = a.profile_id
   where c.codigo = 'passou_montinho'
     and a.status = 'ativo'
     and public.ranking_pode_ver(a.id)
   group by a.id, p.nome
   order by 3 asc;
$$;
revoke all on function public.quem_passou_montinho() from public, anon;
grant execute on function public.quem_passou_montinho() to authenticated;
