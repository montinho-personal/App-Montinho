-- ============================================================================
-- 0072 — Acessos do dia: quem abriu o app em cada dia (1 linha por aluno por
-- dia, horário de Brasília). Guarda só o aluno e o dia. O aluno só registra o
-- próprio acesso pela função; o personal lê (painel mostra só números).
-- ============================================================================
create table if not exists acessos_diarios (
  aluno_id uuid not null references alunos(id) on delete cascade,
  dia date not null,
  primary key (aluno_id, dia)
);
create index if not exists acessos_diarios_dia_idx on acessos_diarios (dia);
alter table acessos_diarios enable row level security;
drop policy if exists acessos_diarios_treinador_le on acessos_diarios;
create policy acessos_diarios_treinador_le on acessos_diarios for select using ((select public.is_treinador()));

create or replace function public.registrar_acesso()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_aluno uuid;
begin
  if auth.uid() is null then return false; end if;
  select id into v_aluno from alunos where profile_id = auth.uid();
  if v_aluno is null then return false; end if;
  insert into acessos_diarios (aluno_id, dia)
  values (v_aluno, (now() at time zone 'America/Sao_Paulo')::date)
  on conflict do nothing;
  return true;
end $$;
revoke all on function public.registrar_acesso() from public, anon;
grant execute on function public.registrar_acesso() to authenticated;
