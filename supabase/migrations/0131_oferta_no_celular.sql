-- 0131 — Oferta dos planos no celular (Fase 2, pedido do Montinho, 30/10/2026).
-- agendar_oferta(): o app chama depois de um treino concluído sem dor; agenda
-- 1 aviso para o dia seguinte às 18h30 (Brasília), no canal das notificações
-- dos desafios (0095: 1 por pessoa a cada 24 h, fora do silêncio,
-- “motivacionais” e chave geral). No máximo 1 a cada 7 dias para o visitante e
-- 1 a cada 14 para o aluno. Só o próprio aluno agenda; respeita a oferta ligada
-- pelo personal (0130) e o “pode fazer aula presencial” para o Pacote.
create or replace function public.agendar_oferta(p_aluno uuid, p_oferta text, p_titulo text, p_corpo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prof uuid; v_mod text; v_presencial boolean; v_cfg text; v_ativo boolean; v_amanha date; v_janela interval;
begin
  if auth.uid() is null then return; end if;
  if p_oferta not in ('consultoria', 'pacote') then raise exception 'oferta inválida'; end if;
  select a.profile_id, a.modalidade, a.pode_presencial into v_prof, v_mod, v_presencial from alunos a where a.id = p_aluno and a.status = 'ativo';
  if v_prof is null then return; end if;
  if v_prof <> auth.uid() then raise exception 'não autorizado'; end if;
  if p_oferta = 'consultoria' and v_mod <> 'visitante' then return; end if;
  if p_oferta = 'pacote' and not v_presencial then return; end if;
  v_cfg := case when p_oferta = 'consultoria' then 'consultoria_visitantes' when v_mod = 'visitante' then 'pacote_visitantes' else 'pacote_alunos' end;
  select ativo into v_ativo from ofertas_config where id = v_cfg;
  if v_ativo is not true then return; end if;
  v_janela := case when v_mod = 'visitante' then interval '7 days' else interval '14 days' end;
  if exists (select 1 from notificacoes_envios where profile_id = v_prof and dedupe like 'oferta:%' and criado_em > now() - v_janela) then return; end if;
  v_amanha := (now() at time zone 'America/Sao_Paulo')::date + 1;
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  values (v_prof, 'desafio', 'oferta:' || p_aluno || ':' || v_amanha,
          (v_amanha + time '18:30') at time zone 'America/Sao_Paulo',
          (v_amanha + time '21:00') at time zone 'America/Sao_Paulo',
          jsonb_build_object('titulo', left(coalesce(p_titulo, 'Bora para o próximo nível?'), 80),
                             'corpo', left(coalesce(p_corpo, 'Veja os planos do Montinho.'), 200),
                             'url', '/aluno/planos'))
  on conflict (dedupe) do nothing;
end $$;
revoke all on function public.agendar_oferta(uuid, text, text, text) from public, anon;
grant execute on function public.agendar_oferta(uuid, text, text, text) to authenticated;
