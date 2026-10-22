-- ============================================================================
-- 0057 — Modo Visitante, fase 6: convites para falar com o Montinho (CTAs).
--
-- Cada vez que um convite (“Quero continuar”, “Monta pra mim”…) aparece, é
-- tocado ou dispensado, fica um registro SEM dado pessoal além do próprio
-- aluno_id (para o painel saber de onde veio cada conversa no WhatsApp).
-- O visitante grava e lê só os próprios eventos; o treinador lê todos.
-- Os textos dos convites ficam no código (src/lib/visitante/ctas.ts).
-- ============================================================================

create table if not exists cta_eventos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  cta text not null check (cta ~ '^[a-z_]{2,40}$'),
  tipo text not null check (tipo in ('exibido', 'clicado', 'dispensado')),
  tela text check (char_length(tela) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists idx_cta_eventos_aluno on cta_eventos(aluno_id, cta, created_at desc);

alter table cta_eventos enable row level security;
create policy cta_eventos_treinador on cta_eventos for select using (public.is_treinador());
create policy cta_eventos_proprio_le on cta_eventos for select using (aluno_id = public.aluno_id_atual());
create policy cta_eventos_proprio_grava on cta_eventos for insert with check (aluno_id = public.aluno_id_atual());
