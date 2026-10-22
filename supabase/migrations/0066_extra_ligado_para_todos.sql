-- ============================================================================
-- 0066 — Treino extra ligado para todos os alunos.
-- Aplicada em produção pelo SQL Editor (22/10/2026).
--
-- Pedido do Montinho (22/10/2026): "pode deixar ligado para todos". Cria a
-- configuração com habilitado = true para cada aluno que ainda não tem (o
-- arquivado fica de fora) e, para os próximos, um gatilho que já cria a linha
-- ligada. O resto segue o padrão: no máximo 1 extra por semana, 12 séries
-- extras, aprovação só para o que é intenso. O personal continua podendo
-- desligar aluno por aluno no painel.
-- ============================================================================
alter table config_extra alter column habilitado set default true;

insert into config_extra (aluno_id, habilitado, atualizado_por)
select a.id, true, null from alunos a
where a.status <> 'arquivado'
on conflict (aluno_id) do update set habilitado = true, updated_at = now();

create or replace function config_extra_ao_criar_aluno() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into config_extra (aluno_id, habilitado, atualizado_por) values (new.id, true, null)
  on conflict (aluno_id) do nothing;
  return new;
end $$;
revoke execute on function config_extra_ao_criar_aluno() from public, anon, authenticated;

drop trigger if exists trg_config_extra_ao_criar_aluno on alunos;
create trigger trg_config_extra_ao_criar_aluno after insert on alunos
  for each row execute function config_extra_ao_criar_aluno();
