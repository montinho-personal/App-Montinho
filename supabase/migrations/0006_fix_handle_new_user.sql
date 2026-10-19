-- ============================================================================
-- Fix do trigger handle_new_user (Migration 0006)
-- ============================================================================
-- Projetos novos do Supabase rodam funções SECURITY DEFINER com search_path
-- restrito, fazendo o cast ::user_role e o insert em profiles falharem com
-- "Database error creating new user". Fixa com search_path explícito + tipos/
-- tabelas schema-qualificados.
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'aluno')
  );
  return new;
end;
$$;
