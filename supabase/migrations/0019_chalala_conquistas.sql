-- ============================================================================
-- 0019 — Meu Chalalá de hoje: conquistas persistidas, reconhecimento do
-- personal e métricas de compartilhamento.
-- * conquistas_aluno: (aluno, código, referência) é único → reabrir a tela ou
--   repetir a requisição nunca duplica. Sem update/delete: histórico permanente.
-- * reconhecimentos: mensagem ESCRITA pelo personal (nunca automática).
-- * eventos_chalala: só eventos agregáveis (sem foto, sem texto livre).
--   Visitas ao link público entram sem aluno (nenhum dado pessoal).
-- ============================================================================

create table if not exists conquistas_aluno (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  codigo text not null check (codigo in ('primeiro_treino','primeira_meta_semanal','primeiro_mes','treinos_10','treinos_25','treinos_50','semanas_consistentes_4','semanas_consistentes_8','acompanhamento_12_semanas','recorde','relatorio_mensal','eu_voltei')),
  referencia text not null check (length(referencia) between 1 and 64),
  conquistado_em timestamptz not null,
  session_id uuid references training_sessions(id) on delete set null,
  titulo text not null check (length(titulo) <= 120),
  descricao text check (descricao is null or length(descricao) <= 600),
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (aluno_id, codigo, referencia)
);
create index if not exists idx_conquistas_aluno on conquistas_aluno(aluno_id, conquistado_em desc);

create table if not exists reconhecimentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  conquista_id uuid references conquistas_aluno(id) on delete set null,
  mensagem text not null check (length(mensagem) between 1 and 600),
  autor_id uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_reconhecimentos_aluno on reconhecimentos(aluno_id, created_at desc);

create table if not exists eventos_chalala (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references alunos(id) on delete cascade,
  tipo text not null check (tipo in ('conclusao_vista','editor_aberto','modelo_escolhido','card_gerado','download','compartilhar_nativo','compartilhar_cancelado','visita_link')),
  modelo text check (modelo is null or length(modelo) <= 20),
  formato text check (formato is null or length(formato) <= 20),
  origem text check (origem is null or length(origem) <= 40),
  created_at timestamptz not null default now(),
  check ((tipo = 'visita_link') = (aluno_id is null))
);
create index if not exists idx_eventos_chalala on eventos_chalala(created_at desc, tipo);

alter table conquistas_aluno enable row level security;
alter table reconhecimentos enable row level security;
alter table eventos_chalala enable row level security;

drop policy if exists conquistas_treinador_le on conquistas_aluno;
create policy conquistas_treinador_le on conquistas_aluno for select using (public.is_treinador());
drop policy if exists conquistas_aluno_le on conquistas_aluno;
create policy conquistas_aluno_le on conquistas_aluno for select using (aluno_id = public.aluno_id_atual());
drop policy if exists conquistas_aluno_insere on conquistas_aluno;
create policy conquistas_aluno_insere on conquistas_aluno for insert with check (aluno_id = public.aluno_id_atual());

drop policy if exists reconhecimentos_treinador on reconhecimentos;
create policy reconhecimentos_treinador on reconhecimentos for all using (public.is_treinador()) with check (public.is_treinador());
drop policy if exists reconhecimentos_aluno_le on reconhecimentos;
create policy reconhecimentos_aluno_le on reconhecimentos for select using (aluno_id = public.aluno_id_atual());

drop policy if exists eventos_chalala_treinador_le on eventos_chalala;
create policy eventos_chalala_treinador_le on eventos_chalala for select using (public.is_treinador());
drop policy if exists eventos_chalala_aluno_insere on eventos_chalala;
create policy eventos_chalala_aluno_insere on eventos_chalala for insert with check (aluno_id is not null and aluno_id = public.aluno_id_atual());
drop policy if exists eventos_chalala_visita on eventos_chalala;
create policy eventos_chalala_visita on eventos_chalala for insert to anon, authenticated with check (aluno_id is null and tipo = 'visita_link');

-- Avisar o aluno de um reconhecimento: só o treinador obtém as inscrições
-- push daquele aluno (para enviar uma notificação genérica, sem dados de saúde).
create or replace function public.push_do_aluno(p_aluno uuid)
returns table (endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = public
as $$
  select i.endpoint, i.p256dh, i.auth
  from push_inscricoes i
  join alunos a on a.profile_id = i.profile_id
  where public.is_treinador() and a.id = p_aluno and i.ativo
$$;
revoke all on function public.push_do_aluno(uuid) from public, anon;
grant execute on function public.push_do_aluno(uuid) to authenticated;
