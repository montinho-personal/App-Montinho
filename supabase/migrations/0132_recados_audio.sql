-- 0132 — Áudio do Montinho durante o treino (pedido do Montinho, 30/10/2026).
-- Bucket privado recados-audio: <aluno_id>/<sessao_id>/<arquivo>. Só o personal
-- grava e gerencia; o aluno só ouve os da própria pasta. O recado continua sendo
-- uma intervenção “mensagem” com referencia.audio = caminho do arquivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recados-audio', 'recados-audio', false, 5242880, array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/wav'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Treinador gerencia áudios dos recados" on storage.objects;
create policy "Treinador gerencia áudios dos recados" on storage.objects for all
  using (bucket_id = 'recados-audio' and public.is_treinador()) with check (bucket_id = 'recados-audio' and public.is_treinador());
drop policy if exists "Aluno ouve os próprios áudios" on storage.objects;
create policy "Aluno ouve os próprios áudios" on storage.objects for select
  using (bucket_id = 'recados-audio' and (storage.foldername(name))[1] = (select id::text from alunos where profile_id = auth.uid()));
