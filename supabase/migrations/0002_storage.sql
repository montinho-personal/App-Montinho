-- ============================================================================
-- Squad App — Storage Buckets & Policies (Migration 0002)
-- ============================================================================
-- Cria 2 buckets:
--   - fotos-evolucao (privado) → fotos de progresso dos alunos
--   - avatars (público) → fotos de perfil
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('fotos-evolucao', 'fotos-evolucao', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies — fotos-evolucao (privado) ----------------------------------------
-- Estrutura de path esperada: <aluno_id>/<arquivo>
create policy "Aluno faz upload na própria pasta (fotos-evolucao)"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-evolucao'
    and (storage.foldername(name))[1] = (
      select id::text from alunos where profile_id = auth.uid()
    )
  );

create policy "Aluno lê próprias fotos (fotos-evolucao)"
  on storage.objects for select
  using (
    bucket_id = 'fotos-evolucao'
    and (
      (storage.foldername(name))[1] = (select id::text from alunos where profile_id = auth.uid())
      or is_treinador()
    )
  );

create policy "Aluno deleta próprias fotos (fotos-evolucao)"
  on storage.objects for delete
  using (
    bucket_id = 'fotos-evolucao'
    and (storage.foldername(name))[1] = (
      select id::text from alunos where profile_id = auth.uid()
    )
  );

create policy "Treinador gerencia fotos-evolucao"
  on storage.objects for all
  using (bucket_id = 'fotos-evolucao' and is_treinador())
  with check (bucket_id = 'fotos-evolucao' and is_treinador());

-- Policies — avatars (público para leitura, dono escreve) --------------------
create policy "Avatars públicos para leitura"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Usuário faz upload do próprio avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Usuário atualiza próprio avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
