-- 0063 — Visitante que se cadastrou antes do WhatsApp obrigatório informa o
-- número pelo app. O aluno não tem UPDATE em `alunos`; esta função grava só o
-- telefone do próprio cadastro, só de visitante e só quando ainda está vazio
-- (não sobrescreve o que o personal cadastrou). Avisa o CRM com o evento
-- `whatsapp_informado` para o contato ganhar o número.

alter table crm_fila drop constraint if exists crm_fila_evento_check;
alter table crm_fila add constraint crm_fila_evento_check check (evento in (
  'lead_novo', 'onboarding_concluido', 'whatsapp_clicado', 'whatsapp_informado',
  'desafio_concluido', 'status_alterado', 'virou_aluno', 'teste'));

create or replace function public.salvar_meu_whatsapp(p_telefone text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then return false; end if;
  if p_telefone is null or length(btrim(p_telefone)) not between 8 and 30 then
    raise exception 'telefone inválido' using errcode = '22023';
  end if;
  update alunos set telefone = btrim(p_telefone)
   where profile_id = auth.uid() and modalidade = 'visitante' and nullif(btrim(telefone), '') is null
  returning id into v_id;
  if v_id is null then return false; end if;
  perform public.crm_enfileirar(v_id, 'whatsapp_informado', jsonb_build_object('telefone', btrim(p_telefone)));
  return true;
end $$;
revoke all on function public.salvar_meu_whatsapp(text) from public, anon;
grant execute on function public.salvar_meu_whatsapp(text) to authenticated;
