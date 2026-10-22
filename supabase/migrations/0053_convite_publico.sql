-- ============================================================================
-- 0053 — Modo Visitante: leitura pública e reserva atômica de convite.
--
--  • convite_publico(codigo)  quem abre /convite/CODIGO (sem login) vê só o
--                             necessário: prazo, campanha e se ainda aceita
--                             cadastro. Nunca lista convites nem mostra usos.
--  • reservar_convite(codigo) soma 1 uso só se o convite ainda valer (ativo,
--                             no prazo, com vaga), numa única instrução —
--                             duas pessoas no último lugar não passam juntas.
--                             Só o servidor (service_role) executa.
-- ============================================================================

create or replace function public.convite_publico(p_codigo text)
returns table (codigo text, tipo_acesso text, dias int, acesso_ate date, campanha text, situacao text)
language sql stable security definer
set search_path = public
as $$
  select c.codigo, c.tipo_acesso, c.dias, c.acesso_ate, k.nome,
    case
      when not c.ativo then 'inativo'
      when c.valido_ate is not null and c.valido_ate <= now() then 'expirado'
      when c.max_usos is not null and c.usos >= c.max_usos then 'esgotado'
      else 'ok'
    end
  from public.convites c
  left join public.campanhas k on k.id = c.campanha_id
  where c.codigo = upper(p_codigo);
$$;
grant execute on function public.convite_publico(text) to anon, authenticated;

create or replace function public.reservar_convite(p_codigo text)
returns setof public.convites
language sql volatile security definer
set search_path = public
as $$
  update public.convites
     set usos = usos + 1
   where codigo = upper(p_codigo)
     and ativo
     and (valido_ate is null or valido_ate > now())
     and (max_usos is null or usos < max_usos)
  returning *;
$$;
revoke execute on function public.reservar_convite(text) from public, anon, authenticated;
grant execute on function public.reservar_convite(text) to service_role;

-- Devolve a vaga quando o cadastro falha depois da reserva.
create or replace function public.devolver_convite(p_id uuid)
returns void
language sql volatile security definer
set search_path = public
as $$
  update public.convites set usos = greatest(usos - 1, 0) where id = p_id;
$$;
revoke execute on function public.devolver_convite(uuid) from public, anon, authenticated;
grant execute on function public.devolver_convite(uuid) to service_role;
