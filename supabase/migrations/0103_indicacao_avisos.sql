-- ============================================================================
-- 0103 — Avisos no celular da indicação premiada (pedido do Montinho em
-- 28/10/2026). Depende de 0095 (canal das notificações de desafio) e 0102.
--  • visitante: no 4º treino concluído (quando o convite libera):
--    “1 amigo que fechar = 10%, 2 = 20%, 3 = 30%”;
--  • aluno: 1 aviso de novidade depois do próximo treino concluído
--    (o desconto vale na próxima renovação).
-- Uma vez por pessoa (dedupe), 3 h depois do treino (não briga com o
-- pós-treino), validade de 2 dias; o canal já limita 1 por pessoa a cada
-- 24 h, respeita silêncio, “motivacionais” e a chave geral. Nunca para o
-- “Meu treino” do personal.
-- ============================================================================
create or replace function public.indicacao_aviso_treino()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mod text; v_prof uuid; v_role text; v_n int;
begin
  if not (new.status = 'concluida' and old.status is distinct from 'concluida') then return new; end if;
  select a.modalidade, a.profile_id, p.role into v_mod, v_prof, v_role
    from alunos a join profiles p on p.id = a.profile_id where a.id = new.aluno_id;
  if v_prof is null or v_role is distinct from 'aluno' then return new; end if;
  if v_mod = 'visitante' then
    select count(*) into v_n from training_sessions where aluno_id = new.aluno_id and status = 'concluida';
    if v_n <> 4 then return new; end if;
    insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
    values (v_prof, 'desafio', 'indicacao_liberou:' || new.aluno_id, now() + interval '3 hours', now() + interval '2 days',
      jsonb_build_object('titulo', '🎁 Seu convite de amigo liberou!',
        'corpo', 'Indique quem quer treinar: 1 amigo que fechar = 10%, 2 = 20%, 3 = 30% de desconto em qualquer plano.',
        'url', '/aluno/indicar'))
    on conflict (dedupe) do nothing;
  elsif v_mod = 'consultoria' then
    insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
    values (v_prof, 'desafio', 'indicacao_novidade:' || new.aluno_id, now() + interval '3 hours', now() + interval '2 days',
      jsonb_build_object('titulo', '🎁 Indique e ganhe desconto na renovação',
        'corpo', 'Cada amigo que fechar com o Montinho vale 10% na sua próxima renovação: 1 amigo = 10%, 2 = 20%, 3 = 30%.',
        'url', '/aluno/indicar'))
    on conflict (dedupe) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.indicacao_aviso_treino() from public, anon, authenticated;
drop trigger if exists trg_indicacao_aviso_treino on training_sessions;
create trigger trg_indicacao_aviso_treino after update of status on training_sessions for each row execute function public.indicacao_aviso_treino();
