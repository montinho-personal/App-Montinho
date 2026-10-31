-- ============================================================================
-- 0137 — O que a pessoa gosta de treinar (Multimodalidade, fase 6).
-- alunos.modalidades_interesse: lista de modalidades marcadas no Perfil ou no
-- cadastro do visitante (vazia = não respondeu). É só PREFERÊNCIA: a modalidade
-- continua sendo do treino e da sessão, nunca da conta. Serve para o personal
-- ver o interesse e para avisar do WOD do dia só a quem quer.
-- salvar_minhas_modalidades(): o próprio aluno grava a lista dele (valida os
-- valores). O personal lê pela RLS de alunos que já existe. Idempotente.
-- ============================================================================
alter table alunos add column if not exists modalidades_interesse text[] not null default '{}';
alter table alunos drop constraint if exists alunos_modalidades_interesse_check;
alter table alunos add constraint alunos_modalidades_interesse_check
  check (modalidades_interesse <@ array['musculacao','cross','hyrox','funcional','hibrido']::text[] and cardinality(modalidades_interesse) <= 5);

create or replace function public.salvar_minhas_modalidades(p_modalidades text[])
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v text[];
begin
  if auth.uid() is null or public.aluno_id_atual() is null then return false; end if;
  select coalesce(array_agg(distinct m order by m), '{}') into v
    from unnest(coalesce(p_modalidades, '{}')) m
   where m in ('musculacao','cross','hyrox','funcional','hibrido');
  update alunos set modalidades_interesse = v where id = public.aluno_id_atual();
  return true;
end $$;
revoke all on function public.salvar_minhas_modalidades(text[]) from public, anon;
grant execute on function public.salvar_minhas_modalidades(text[]) to authenticated;
