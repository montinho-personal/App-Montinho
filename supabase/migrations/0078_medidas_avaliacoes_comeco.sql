-- ============================================================================
-- 0078 — Medidas e avaliações (Ponto de Partida) + troféus do Começo.
--   • evolucao ganha os campos de bioimpedância/avaliação e quem registrou;
--   • avaliacoes_arquivos: PDF/foto/print de avaliações (bucket privado);
--   • salvar_minha_altura(): o aluno atualiza só a própria altura;
--   • códigos novos das conquistas (Começo, 23/10/2026).
-- Nada é apagado: medidas antigas continuam valendo.
-- ============================================================================
alter table evolucao add column if not exists altura_cm numeric(5, 1);
alter table evolucao add column if not exists massa_muscular_kg numeric(5, 2);
alter table evolucao add column if not exists massa_magra_kg numeric(5, 2);
alter table evolucao add column if not exists gordura_visceral numeric(4, 1);
alter table evolucao add column if not exists agua_pct numeric(4, 1);
alter table evolucao add column if not exists abdomen_cm numeric(5, 2);
alter table evolucao add column if not exists panturrilha_cm numeric(5, 2);
alter table evolucao add column if not exists origem text not null default 'aluno' check (origem in ('aluno', 'personal', 'importado'));
alter table evolucao add column if not exists registrado_por uuid references profiles(id) on delete set null default auth.uid();

create table if not exists avaliacoes_arquivos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  caminho text not null unique check (length(caminho) between 5 and 300),
  nome_original text not null check (length(nome_original) between 1 and 200),
  tipo_mime text not null check (tipo_mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')),
  tamanho_bytes integer not null check (tamanho_bytes between 1 and 15728640),
  data_avaliacao date not null default current_date,
  descricao text check (descricao is null or length(descricao) <= 300),
  evolucao_id uuid references evolucao(id) on delete set null,
  enviado_por uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_avaliacoes_arquivos_aluno on avaliacoes_arquivos(aluno_id, data_avaliacao desc);
alter table avaliacoes_arquivos enable row level security;
drop policy if exists aval_arq_aluno_le on avaliacoes_arquivos;
create policy aval_arq_aluno_le on avaliacoes_arquivos for select using (aluno_id = (select public.aluno_id_atual()));
drop policy if exists aval_arq_aluno_insere on avaliacoes_arquivos;
create policy aval_arq_aluno_insere on avaliacoes_arquivos for insert with check (aluno_id = (select public.aluno_id_atual()) and split_part(caminho, '/', 1) = aluno_id::text);
drop policy if exists aval_arq_treinador on avaliacoes_arquivos;
create policy aval_arq_treinador on avaliacoes_arquivos for all using ((select public.is_treinador())) with check ((select public.is_treinador()));

-- Bucket privado: <aluno_id>/<arquivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avaliacoes', 'avaliacoes', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Aluno envia avaliação na própria pasta" on storage.objects;
create policy "Aluno envia avaliação na própria pasta" on storage.objects for insert
  with check (bucket_id = 'avaliacoes' and (storage.foldername(name))[1] = (select id::text from alunos where profile_id = auth.uid()));
drop policy if exists "Aluno lê as próprias avaliações" on storage.objects;
create policy "Aluno lê as próprias avaliações" on storage.objects for select
  using (bucket_id = 'avaliacoes' and ((storage.foldername(name))[1] = (select id::text from alunos where profile_id = auth.uid()) or public.is_treinador()));
drop policy if exists "Treinador gerencia avaliações" on storage.objects;
create policy "Treinador gerencia avaliações" on storage.objects for all
  using (bucket_id = 'avaliacoes' and public.is_treinador()) with check (bucket_id = 'avaliacoes' and public.is_treinador());

create or replace function public.salvar_minha_altura(p_altura numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_altura is null or p_altura < 100 or p_altura > 250 then return false; end if;
  update alunos set altura_cm = round(p_altura)::int where profile_id = auth.uid();
  return found;
end $$;
revoke all on function public.salvar_minha_altura(numeric) from public, anon;
grant execute on function public.salvar_minha_altura(numeric) to authenticated;

alter table conquistas_aluno drop constraint if exists conquistas_aluno_codigo_check;
alter table conquistas_aluno add constraint conquistas_aluno_codigo_check check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','missao_cumprida','cada_quilo_conta','terceiro_especial','voltei_pro_jogo','ponto_de_partida','olhar_de_aguia','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_5','semanas_consistentes_6','semanas_consistentes_8','semanas_consistentes_10','semanas_consistentes_12','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei','criando_raizes','constancia_vida_real','constancia_verdade','recomeco_consistente','fiz_o_necessario','nunca_deixei_pra_depois','fui_alem','milha_extra','sempre_um_a_mais','uma_a_mais','primeira_tecnica','tecnicas_2','tecnicas_3','tecnicas_4','tecnicas_5','tecnicas_7','tecnicas_10','mestre_tecnicas','chegou_intensificacao','completou_adaptacao','completou_intensificacao','completou_consolidacao','protocolo_completo','desafio_concluido'));

-- Olhar de Águia: só o personal ativa (vídeo recebido pelo WhatsApp); o aluno não concede a si mesmo.
alter table conquistas_aluno drop constraint if exists conquistas_aluno_origem_check;
alter table conquistas_aluno add constraint conquistas_aluno_origem_check check (origem in ('app', 'importado', 'personal'));
drop policy if exists conquistas_aluno_insere on conquistas_aluno;
create policy conquistas_aluno_insere on conquistas_aluno for insert with check (aluno_id = public.aluno_id_atual() and codigo <> 'olhar_de_aguia');
drop policy if exists conquistas_treinador_ativa on conquistas_aluno;
create policy conquistas_treinador_ativa on conquistas_aluno for insert with check ((select public.is_treinador()) and codigo = 'olhar_de_aguia' and origem = 'personal');
