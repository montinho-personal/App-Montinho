-- ============================================================================
-- 0064 — CRM: clique no convite do Instagram não é clique no WhatsApp.
--
-- O convite "Seguir @montinho_personal" (cta = 'instagram') grava os mesmos
-- eventos dos convites do WhatsApp em cta_eventos. O gatilho do CRM mandava
-- todo "clicado" como whatsapp_clicado; agora o do Instagram fica de fora.
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
    if new.tipo = 'clicado' and new.cta <> 'instagram' then perform public.crm_enfileirar(new.aluno_id, 'whatsapp_clicado', jsonb_build_object('convite', new.cta, 'tela', new.tela)); end if;
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
