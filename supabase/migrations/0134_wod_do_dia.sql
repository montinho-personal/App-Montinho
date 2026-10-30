-- ============================================================================
-- 0134 — WOD do dia + ranking do dia (Multimodalidade, fase 3; referência
-- funcional: app de aluno de box da Tecnofit; aprovado pelo Montinho em 30/10/2026).
--  • wods_do_dia: 1 WOD publicado por dia (dia de Brasília), blocos no mesmo
--    formato de `treinos.blocos`. Só o personal cria/edita; todo logado lê os
--    publicados. Nada é apagado: despublicar = publicado=false.
--  • A sessão de quem faz guarda `snapshot.wod_dia_id` (sessão extra, sem
--    treino da ficha), e o resultado vai em `sessao_blocos` como sempre.
--  • ranking_wod_dia(p_wod): os resultados do bloco WOD daquele dia. Aluno vê
--    só quem está no ranking (alunos.ranking_visivel) com o nome curto, e a si
--    mesmo; o personal vê todos com o nome completo. RX e Scaled são separados
--    na tela (resultado.ts#rankingDoWod); adaptado nunca entra.
-- Idempotente.
-- ============================================================================
create table if not exists wods_do_dia (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titulo text not null check (length(titulo) between 2 and 80),
  modalidade text not null default 'cross' check (modalidade in ('cross', 'hyrox', 'funcional', 'hibrido')),
  blocos jsonb not null default '[]'::jsonb check (jsonb_typeof(blocos) = 'array' and jsonb_array_length(blocos) <= 12),
  observacoes text check (length(observacoes) <= 500),
  publicado boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists wods_do_dia_data_publicado on wods_do_dia (data) where publicado;
create index if not exists wods_do_dia_data_idx on wods_do_dia (data desc);
alter table wods_do_dia enable row level security;
drop policy if exists wods_dia_le on wods_do_dia;
create policy wods_dia_le on wods_do_dia for select using (publicado and (select auth.uid()) is not null);
drop policy if exists wods_dia_treinador on wods_do_dia;
create policy wods_dia_treinador on wods_do_dia for all using ((select public.is_treinador())) with check ((select public.is_treinador()));

create index if not exists training_sessions_wod_dia_idx on training_sessions ((snapshot->>'wod_dia_id')) where snapshot ? 'wod_dia_id';

create or replace function public.ranking_wod_dia(p_wod uuid)
returns table (ref text, nome text, eu boolean, condicao text, formato text, concluido boolean, tempo_seg int, time_cap_seg int, rounds int, reps int, carga_kg numeric, intervalos jsonb, modificacoes text, registrado_em timestamptz)
language sql stable security definer set search_path = public as $$
  select md5(a.id::text) as ref,
         case when public.is_treinador() then coalesce(nullif(btrim(p.nome), ''), 'Aluno') else public.nome_curto(p.nome) end as nome,
         a.id = public.aluno_id_atual() as eu,
         b.condicao, b.formato, b.concluido, b.tempo_seg, b.time_cap_seg, b.rounds, b.reps, b.carga_kg, b.intervalos,
         case when public.is_treinador() or a.id = public.aluno_id_atual() then b.modificacoes else null end,
         b.updated_at
  from sessao_blocos b
  join training_sessions s on s.id = b.session_id
  join alunos a on a.id = b.aluno_id
  left join profiles p on p.id = a.profile_id
  where s.snapshot->>'wod_dia_id' = p_wod::text
    and b.tipo = 'metcon'
    and s.status <> 'abandonada'
    and (public.is_treinador() or public.aluno_id_atual() is not null)
    and (public.is_treinador() or a.id = public.aluno_id_atual() or a.ranking_visivel)
  order by b.updated_at;
$$;
revoke all on function public.ranking_wod_dia(uuid) from public, anon;
grant execute on function public.ranking_wod_dia(uuid) to authenticated;
