-- ============================================================================
-- 0112 — Pedido de avaliação no Google para os visitantes (pedido do Montinho,
-- 29/10/2026). Regras puras em src/lib/visitante/avaliacao.ts.
--  • Os eventos do pedido vão para cta_eventos (avaliacao_google /
--    avaliacao_feita / avaliacao_sugestao), sem tabela nova. O gatilho do CRM
--    não manda “abriu o Google” nem “já avaliei” como clique no WhatsApp (a
--    sugestão, que abre o WhatsApp, continua indo).
--  • agendar_lembrete_avaliacao(): 1 lembrete no celular no dia seguinte ao
--    1º pedido, às 19h30 (Brasília), no canal das notificações de desafio
--    (0095: 1 por pessoa a cada 24 h, fora do silêncio, “motivacionais” e chave
--    geral). Uma vez por pessoa, para sempre (dedupe fixo). Respondeu antes da
--    hora → p_agendar = false descarta o que ainda não saiu.
--    Só o próprio visitante agenda.
-- ============================================================================
create or replace function public.crm_gatilho()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Um IF por tabela: cada uma tem colunas diferentes em NEW/OLD.
  if tg_table_name = 'acessos_visitante' then
    if tg_op = 'INSERT' then perform public.crm_enfileirar(new.aluno_id, 'lead_novo'); end if;
  elsif tg_table_name = 'perfil_visitante' then
    if new.onboarding_concluido_em is not null and (tg_op = 'INSERT' or old.onboarding_concluido_em is null) then
      perform public.crm_enfileirar(new.aluno_id, 'onboarding_concluido');
    end if;
  elsif tg_table_name = 'cta_eventos' then
    if new.tipo = 'clicado' and new.cta not in ('instagram', 'avaliacao_google', 'avaliacao_feita') then perform public.crm_enfileirar(new.aluno_id, 'whatsapp_clicado', jsonb_build_object('convite', new.cta, 'tela', new.tela)); end if;
  elsif tg_table_name = 'conquistas_aluno' then
    if new.codigo = 'desafio_concluido' then perform public.crm_enfileirar(new.aluno_id, 'desafio_concluido', jsonb_build_object('campanha_id', new.referencia)); end if;
  elsif tg_table_name = 'leads_status' then
    if tg_op = 'INSERT' or old.status is distinct from new.status then perform public.crm_enfileirar(new.aluno_id, 'status_alterado', jsonb_build_object('status', new.status)); end if;
  elsif tg_table_name = 'alunos' then
    if old.modalidade = 'visitante' and new.modalidade = 'consultoria' then perform public.crm_enfileirar(new.id, 'virou_aluno'); end if;
  end if;
  return new;
end $$;
revoke all on function public.crm_gatilho() from public, anon, authenticated;

create or replace function public.agendar_lembrete_avaliacao(p_aluno uuid, p_agendar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prof uuid; v_amanha date;
begin
  if auth.uid() is null then return; end if;
  select a.profile_id into v_prof from alunos a where a.id = p_aluno and a.status = 'ativo' and a.modalidade = 'visitante';
  if v_prof is null then return; end if;
  if v_prof <> auth.uid() then raise exception 'não autorizado'; end if;
  if not p_agendar then
    update notificacoes_envios set status = 'descartada', motivo = 'respondida'
     where profile_id = v_prof and categoria = 'desafio' and status = 'pendente' and dedupe = 'avaliacao:' || p_aluno;
    return;
  end if;
  v_amanha := (now() at time zone 'America/Sao_Paulo')::date + 1;
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  values (v_prof, 'desafio', 'avaliacao:' || p_aluno,
          (v_amanha + time '19:30') at time zone 'America/Sao_Paulo',
          (v_amanha + time '21:30') at time zone 'America/Sao_Paulo',
          jsonb_build_object('titulo', 'Como está sendo treinar com o app? ⭐',
                             'corpo', 'Uma avaliação no Google leva 30 segundos e ajuda muito o Montinho. Conta como foi?',
                             'url', '/aluno/avaliar'))
  on conflict (dedupe) do nothing;
end $$;
revoke all on function public.agendar_lembrete_avaliacao(uuid, boolean) from public, anon;
grant execute on function public.agendar_lembrete_avaliacao(uuid, boolean) to authenticated;
