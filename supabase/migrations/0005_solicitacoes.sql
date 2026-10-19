-- ============================================================================
-- Squad App — Solicitações recorrentes (Migration 0005)
-- ============================================================================
-- Pedidos automáticos ao aluno (fotos, questionário, medidas, exames) com
-- recorrência configurável. Um cron diário (/api/cron/solicitacoes) varre as
-- que venceram, dispara um lembrete no chat e reprograma a próxima.
-- Também expande fotos.tipo pra cobrir poses de palco (pose/confronto).
-- ============================================================================

create type solicitacao_tipo as enum ('foto', 'questionario', 'medida', 'exame');

create table solicitacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  tipo solicitacao_tipo not null,
  titulo text not null,
  descricao text,
  recorrencia_dias integer,          -- null = envio único; 7 = semanal; etc.
  proxima_em date not null default current_date,
  ultima_em date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_solicitacoes_aluno on solicitacoes(aluno_id, proxima_em);
create index idx_solicitacoes_devidas on solicitacoes(proxima_em) where ativo;

create trigger trg_solicitacoes_updated before update on solicitacoes
  for each row execute function set_updated_at();

alter table solicitacoes enable row level security;

create policy "Aluno lê próprias solicitações"
  on solicitacoes for select using (aluno_id = aluno_id_atual() or is_treinador());
create policy "Treinador gerencia solicitações"
  on solicitacoes for all using (is_treinador()) with check (is_treinador());

-- Expande os tipos de foto pra cobrir poses de categoria e confronto de palco.
alter table fotos drop constraint if exists fotos_tipo_check;
alter table fotos add constraint fotos_tipo_check
  check (tipo in ('frente', 'lado', 'costas', 'pose', 'confronto', 'outro'));
