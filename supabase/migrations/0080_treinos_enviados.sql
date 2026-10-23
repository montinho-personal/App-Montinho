-- ============================================================================
-- 0080 — Visitante envia o treino que já tem (print, foto do papel, PDF).
-- A IA tenta ler na hora (o rascunho só é salvo depois que a pessoa confere);
-- quando não dá para ler, o arquivo vai para a lista “Treinos para montar” do
-- personal. Arquivo no bucket privado “treinos-enviados”, pasta do aluno.
-- ============================================================================
create table if not exists treinos_enviados (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  caminho text not null unique check (length(caminho) between 5 and 300),
  tipo_mime text not null check (tipo_mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')),
  tamanho_bytes integer not null check (tamanho_bytes between 1 and 15728640),
  observacao text check (observacao is null or length(observacao) <= 500),
  status text not null default 'pendente' check (status in ('pendente', 'montado', 'descartado')),
  created_at timestamptz not null default now(),
  resolvido_em timestamptz
);
create index if not exists idx_treinos_enviados_status on treinos_enviados(status, created_at desc);
alter table treinos_enviados enable row level security;
drop policy if exists tenv_aluno_le on treinos_enviados;
create policy tenv_aluno_le on treinos_enviados for select using (aluno_id = (select public.aluno_id_atual()));
drop policy if exists tenv_aluno_envia on treinos_enviados;
create policy tenv_aluno_envia on treinos_enviados for insert
  with check (aluno_id = (select public.aluno_id_atual()) and split_part(caminho, '/', 1) = aluno_id::text and status = 'pendente');
drop policy if exists tenv_treinador on treinos_enviados;
create policy tenv_treinador on treinos_enviados for all using ((select public.is_treinador())) with check ((select public.is_treinador()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('treinos-enviados', 'treinos-enviados', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Aluno envia treino na própria pasta" on storage.objects;
create policy "Aluno envia treino na própria pasta" on storage.objects for insert
  with check (bucket_id = 'treinos-enviados' and (storage.foldername(name))[1] = (select id::text from alunos where profile_id = auth.uid()));
drop policy if exists "Aluno lê os próprios treinos enviados" on storage.objects;
create policy "Aluno lê os próprios treinos enviados" on storage.objects for select
  using (bucket_id = 'treinos-enviados' and ((storage.foldername(name))[1] = (select id::text from alunos where profile_id = auth.uid()) or public.is_treinador()));
drop policy if exists "Treinador gerencia treinos enviados" on storage.objects;
create policy "Treinador gerencia treinos enviados" on storage.objects for all
  using (bucket_id = 'treinos-enviados' and public.is_treinador()) with check (bucket_id = 'treinos-enviados' and public.is_treinador());
