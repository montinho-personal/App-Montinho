-- ============================================================================
-- 0030 — Montinho Desbloqueia (mitos, verdades e ciência do treino).
-- * conhecimento_conteudos: edições do personal e conteúdos novos (a base de
--   30 descobertas vive no código; o banco vence quando há edição).
-- * conhecimento_versoes: histórico imutável de cada versão (auditoria).
-- * conhecimento_aluno: o que o aluno explorou/salvou e recomendações do
--   personal. Disponibilidade por medalha é derivada (não gravada).
-- * exercicio_porque: “Por que esse exercício está no meu treino?”, escrito
--   pelo personal.
-- RLS: personal edita; aluno lê só o publicado e só o próprio progresso.
-- ============================================================================

create table if not exists conhecimento_conteudos (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  dados jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho' check (status in ('rascunho','em_revisao','publicado','arquivado')),
  versao integer not null default 1 check (versao >= 1),
  ordem integer,
  atualizado_por uuid references profiles(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists conhecimento_versoes (
  id uuid primary key default gen_random_uuid(),
  conteudo_id text not null,
  versao integer not null,
  status text not null,
  dados jsonb not null,
  autor uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (conteudo_id, versao)
);

create table if not exists conhecimento_aluno (
  aluno_id uuid not null references alunos(id) on delete cascade,
  conteudo_id text not null check (length(conteudo_id) between 2 and 41),
  origem text check (origem is null or origem in ('conquista','periodo','personal','contexto','biblioteca')),
  disponivel_em timestamptz,
  explorado_em timestamptz,
  resposta text check (resposta is null or length(resposta) <= 20),
  acertou boolean,
  salvo boolean not null default false,
  recomendado_por uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (aluno_id, conteudo_id)
);

create table if not exists exercicio_porque (
  exercicio_id uuid primary key references exercicios(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  texto text not null check (length(texto) between 1 and 600),
  atualizado_por uuid references profiles(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_exercicio_porque_aluno on exercicio_porque(aluno_id);

alter table conhecimento_conteudos enable row level security;
alter table conhecimento_versoes enable row level security;
alter table conhecimento_aluno enable row level security;
alter table exercicio_porque enable row level security;

drop policy if exists conhecimento_conteudos_treinador on conhecimento_conteudos;
create policy conhecimento_conteudos_treinador on conhecimento_conteudos for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists conhecimento_conteudos_publicado on conhecimento_conteudos;
create policy conhecimento_conteudos_publicado on conhecimento_conteudos for select using (status = 'publicado' and (select auth.uid()) is not null);

drop policy if exists conhecimento_versoes_treinador_le on conhecimento_versoes;
create policy conhecimento_versoes_treinador_le on conhecimento_versoes for select using ((select public.is_treinador()));
drop policy if exists conhecimento_versoes_treinador_insere on conhecimento_versoes;
create policy conhecimento_versoes_treinador_insere on conhecimento_versoes for insert with check ((select public.is_treinador()));

drop policy if exists conhecimento_aluno_proprio on conhecimento_aluno;
create policy conhecimento_aluno_proprio on conhecimento_aluno for all using (aluno_id = (select public.aluno_id_atual())) with check (aluno_id = (select public.aluno_id_atual()));
drop policy if exists conhecimento_aluno_treinador on conhecimento_aluno;
create policy conhecimento_aluno_treinador on conhecimento_aluno for all using ((select public.is_treinador())) with check ((select public.is_treinador()));

drop policy if exists exercicio_porque_treinador on exercicio_porque;
create policy exercicio_porque_treinador on exercicio_porque for all using ((select public.is_treinador())) with check ((select public.is_treinador()));
drop policy if exists exercicio_porque_aluno_le on exercicio_porque;
create policy exercicio_porque_aluno_le on exercicio_porque for select using (aluno_id = (select public.aluno_id_atual()));

alter table eventos_chalala drop constraint if exists eventos_chalala_tipo_check;
alter table eventos_chalala add constraint eventos_chalala_tipo_check check (tipo in (
  'conclusao_vista','editor_aberto','modelo_escolhido','card_gerado','download','compartilhar_nativo','compartilhar_cancelado','visita_link',
  'vitrine_vista','explicacao_aberta','colecao_vista',
  'conhecimento_aberto','quiz_respondido','sugestao_vista','sugestao_aberta','descoberta_salva','descoberta_compartilhada'
));
