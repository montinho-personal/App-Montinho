-- ============================================================================
-- 0068 — Campanha “Convide um amigo e ganhe +10 dias” (Modo Visitante).
-- Pedido do Montinho (22/10/2026): quem já está engajado (4 treinos
-- concluídos) recebe um link pessoal de convite; cada amigo que CRIA A CONTA
-- por ele dá +10 dias de acesso a quem convidou, até 3 amigos (+30 dias).
-- O amigo entra com os 30 dias normais.
--  • O link é um convite comum (mesmo cadastro de /convite/CODIGO), código
--    AMIGO-XXXXX, ligado ao visitante em convites.indicador_aluno_id.
--  • meu_convite_indicacao(): o próprio visitante pega/cria o código dele
--    (só com login, só visitante, só com 4+ treinos concluídos).
--  • O bônus é aplicado pelo banco, no cadastro do amigo (gatilho em
--    acessos_visitante), de forma atômica e com o limite de +30 dias.
-- ============================================================================

alter table convites add column if not exists indicador_aluno_id uuid references alunos(id) on delete set null;
create unique index if not exists idx_convites_indicador on convites(indicador_aluno_id) where indicador_aluno_id is not null;

create table if not exists indicacoes (
  id uuid primary key default gen_random_uuid(),
  indicador_aluno_id uuid not null references alunos(id) on delete cascade,
  indicado_aluno_id uuid not null unique references alunos(id) on delete cascade,
  dias_bonus int not null default 0 check (dias_bonus between 0 and 30),
  created_at timestamptz not null default now()
);
create index if not exists idx_indicacoes_indicador on indicacoes(indicador_aluno_id);
alter table indicacoes enable row level security;
drop policy if exists "Indicador e treinador leem indicações" on indicacoes;
create policy "Indicador e treinador leem indicações" on indicacoes for select
  using (indicador_aluno_id in (select id from alunos where profile_id = (select auth.uid())) or (select public.is_treinador()));
-- Sem insert/update/delete pela API: só o gatilho (security definer) grava.

create or replace function public.meu_convite_indicacao()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid;
  v_cod text;
begin
  if auth.uid() is null then return null; end if;
  select id into v_aluno from alunos where profile_id = auth.uid() and modalidade = 'visitante';
  if v_aluno is null then return null; end if;
  select codigo into v_cod from convites where indicador_aluno_id = v_aluno;
  if v_cod is not null then return v_cod; end if;
  if (select count(*) from training_sessions where aluno_id = v_aluno and status = 'concluida') < 4 then return null; end if;
  for tentativa in 1..8 loop
    v_cod := 'AMIGO-' || (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 5));
    begin
      insert into convites (codigo, tipo_acesso, dias, origem, indicador_aluno_id, criado_por)
      values (v_cod, 'dias', 30, 'indicacao', v_aluno, null);
      return v_cod;
    exception when unique_violation then
      -- código repetido ou criado ao mesmo tempo em outra aba
      select codigo into v_cod from convites where indicador_aluno_id = v_aluno;
      if v_cod is not null then return v_cod; end if;
    end;
  end loop;
  return null;
end $$;
revoke all on function public.meu_convite_indicacao() from public, anon;
grant execute on function public.meu_convite_indicacao() to authenticated;

create or replace function public.indicacao_gatilho()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ind uuid;
  v_ganhos int;
  v_bonus int := 0;
  v_fim timestamptz;
begin
  if new.convite_id is null then return new; end if;
  select indicador_aluno_id into v_ind from convites where id = new.convite_id;
  if v_ind is null or v_ind = new.aluno_id then return new; end if;
  perform 1 from alunos where id = v_ind for update; -- um bônus de cada vez por indicador
  select coalesce(sum(dias_bonus), 0) into v_ganhos from indicacoes where indicador_aluno_id = v_ind;
  if v_ganhos < 30 and exists (select 1 from alunos where id = v_ind and modalidade = 'visitante') then v_bonus := 10; end if;
  insert into indicacoes (indicador_aluno_id, indicado_aluno_id, dias_bonus) values (v_ind, new.aluno_id, v_bonus)
  on conflict (indicado_aluno_id) do nothing;
  if found and v_bonus > 0 then
    update acessos_visitante set fim = greatest(fim, now()) + make_interval(days => v_bonus), updated_at = now()
     where aluno_id = v_ind and fim is not null
    returning fim into v_fim;
    if v_fim is not null then update alunos set acesso_ate = (v_fim at time zone 'UTC')::date where id = v_ind; end if;
  end if;
  return new;
end $$;
revoke all on function public.indicacao_gatilho() from public, anon, authenticated;
drop trigger if exists trg_indicacao on acessos_visitante;
create trigger trg_indicacao after insert on acessos_visitante for each row execute function public.indicacao_gatilho();
