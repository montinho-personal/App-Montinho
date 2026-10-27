-- ============================================================================
-- 0102 — Indicação com desconto (pedido do Montinho em 28/10/2026).
-- Quem indica (visitante OU aluno) ganha 10% de desconto em qualquer plano
-- para cada amigo indicado que FECHAR (o personal passa o amigo de visitante
-- para aluno). Os descontos somam até 30% e não têm prazo. O amigo entra com
-- os 30 dias normais. O pagamento continua fora do app: o personal marca
-- “desconto usado” no painel.
--  • indicacoes: fechou_em, desconto_pct (10 ao fechar), desconto_usado_em.
--  • meu_convite_indicacao(): aluno (consultoria) também pega o link; o
--    visitante continua precisando de 4+ treinos concluídos. O +10 dias por
--    amigo cadastrado continua só para visitante (0068, sem mudança).
--  • gatilho em alunos (visitante → consultoria): marca o fechamento e avisa
--    quem indicou no celular (canal das notificações de desafio, 0095).
--  • o personal atualiza indicacoes (marcar o desconto como usado).
-- ============================================================================
alter table indicacoes add column if not exists fechou_em timestamptz;
alter table indicacoes add column if not exists desconto_pct smallint not null default 0 check (desconto_pct between 0 and 30);
alter table indicacoes add column if not exists desconto_usado_em timestamptz;

drop policy if exists "Treinador atualiza indicações" on indicacoes;
create policy "Treinador atualiza indicações" on indicacoes for update
  using ((select public.is_treinador())) with check ((select public.is_treinador()));

create or replace function public.meu_convite_indicacao()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid;
  v_modalidade text;
  v_cod text;
begin
  if auth.uid() is null then return null; end if;
  select id, modalidade into v_aluno, v_modalidade from alunos where profile_id = auth.uid() and status = 'ativo';
  if v_aluno is null then return null; end if;
  select codigo into v_cod from convites where indicador_aluno_id = v_aluno;
  if v_cod is not null then return v_cod; end if;
  if v_modalidade = 'visitante' and (select count(*) from training_sessions where aluno_id = v_aluno and status = 'concluida') < 4 then return null; end if;
  for tentativa in 1..8 loop
    v_cod := 'AMIGO-' || (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 5));
    begin
      insert into convites (codigo, tipo_acesso, dias, origem, indicador_aluno_id, criado_por)
      values (v_cod, 'dias', 30, 'indicacao', v_aluno, null);
      return v_cod;
    exception when unique_violation then
      select codigo into v_cod from convites where indicador_aluno_id = v_aluno;
      if v_cod is not null then return v_cod; end if;
    end;
  end loop;
  return null;
end $$;
revoke all on function public.meu_convite_indicacao() from public, anon;
grant execute on function public.meu_convite_indicacao() to authenticated;

create or replace function public.indicacao_fechou()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ind uuid;
  v_amigo text;
begin
  if not (old.modalidade = 'visitante' and new.modalidade = 'consultoria') then return new; end if;
  update indicacoes set fechou_em = now(), desconto_pct = 10
   where indicado_aluno_id = new.id and fechou_em is null
  returning indicador_aluno_id into v_ind;
  if v_ind is null then return new; end if;
  select public.nome_curto(p.nome) into v_amigo from profiles p where p.id = new.profile_id;
  perform public.desafio_enfileirar(v_ind, 'indicacao_fechou:' || new.id,
    '🎁 Você ganhou 10% de desconto!', coalesce(v_amigo, 'Seu amigo') || ' fechou com o Montinho pelo seu convite. O desconto já está no seu app.',
    '/aluno/indicar', interval '3 days');
  return new;
end $$;
revoke all on function public.indicacao_fechou() from public, anon, authenticated;
drop trigger if exists trg_indicacao_fechou on alunos;
create trigger trg_indicacao_fechou after update of modalidade on alunos for each row execute function public.indicacao_fechou();
