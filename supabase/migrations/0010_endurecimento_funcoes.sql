-- ============================================================================
-- Montinho Personal Trainer — Endurecimento de funções (Migration 0010)
-- ============================================================================
-- Responde aos avisos do Security Advisor do Supabase após a 0009:
--   1. search_path fixo em todas as funções (evita sequestro por schema).
--   2. handle_new_user é um trigger: ninguém deve chamá-la pela API.
--      Só o papel interno de auth (supabase_auth_admin) precisa executá-la.
--   3. marcar_ultimo_treino só faz sentido para usuários logados.
-- is_treinador() e aluno_id_atual() continuam executáveis por anon/authenticated
-- porque as policies de RLS dependem delas (para anon retornam false/null).
-- ============================================================================

alter function public.set_updated_at() set search_path = public;
alter function public.normalizar_nome(text) set search_path = public;

revoke all on function public.handle_new_user() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$;

revoke all on function public.marcar_ultimo_treino(uuid) from public, anon;
grant execute on function public.marcar_ultimo_treino(uuid) to authenticated;
