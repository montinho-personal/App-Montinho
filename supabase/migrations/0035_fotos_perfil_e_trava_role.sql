-- ============================================================================
-- 0035 — Foto de perfil do aluno + trava de segurança em profiles
-- ----------------------------------------------------------------------------
-- 1) SEGURANÇA: até aqui qualquer usuário logado podia alterar QUALQUER coluna
--    do próprio profile — inclusive `role` (virar treinador) e `email`. Agora
--    só `nome`, `avatar_url` e `updated_at` podem ser alterados pelo app com
--    RLS (a troca de papel continua só pela chave de serviço, no servidor).
-- 2) Foto: o aluno pode apagar o PRÓPRIO arquivo no bucket `avatars` e o bucket
--    passa a aceitar só imagens leves (1 MB; jpeg/png/webp).
-- Migração aditiva e idempotente.
-- ============================================================================

-- 1) Trava de colunas ---------------------------------------------------------
revoke update on public.profiles from authenticated, anon;
grant update (nome, avatar_url, updated_at) on public.profiles to authenticated;

alter policy "Usuário atualiza próprio profile" on public.profiles
  using (id = auth.uid()) with check (id = auth.uid());
alter policy "Treinador atualiza qualquer profile" on public.profiles
  using (is_treinador()) with check (is_treinador());

-- 2) Fotos de perfil ----------------------------------------------------------
drop policy if exists "Usuário apaga próprio avatar" on storage.objects;
create policy "Usuário apaga próprio avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    update storage.buckets
       set file_size_limit = 1048576,
           allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
     where id = 'avatars';
  end if;
end $$;
