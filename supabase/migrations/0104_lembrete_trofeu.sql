-- ============================================================================
-- 0104 — Lembrete no celular do troféu que está perto (pedido do Montinho em
-- 28/10/2026: “lembrete para tudo que a pessoa estiver prestes a completar”).
-- O app calcula o troféu mais perto (src/lib/conquistas/ao-alcance.ts) ao fim
-- de cada treino ou cardio e chama agendar_lembrete_trofeu(): 1 aviso para o
-- dia seguinte às 11h30 (Brasília), no canal das notificações de desafio
-- (0095: 1 por pessoa a cada 24 h, fora do silêncio, “motivacionais” e chave
-- geral). Cada novo cálculo TROCA o aviso pendente (nunca acumula); ganhou o
-- troféu antes da hora → o próximo cálculo descarta. Máx. 3 por semana.
-- Só o próprio aluno ou o personal (aula presencial) agendam.
-- ============================================================================
create or replace function public.agendar_lembrete_trofeu(p_aluno uuid, p_codigo text, p_titulo text, p_corpo text, p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prof uuid; v_role text; v_amanha date;
begin
  if auth.uid() is null then return; end if;
  select a.profile_id, p.role into v_prof, v_role from alunos a join profiles p on p.id = a.profile_id where a.id = p_aluno and a.status = 'ativo';
  if v_prof is null or v_role is distinct from 'aluno' then return; end if;
  if not (v_prof = auth.uid() or public.is_treinador()) then raise exception 'não autorizado'; end if;
  -- O lembrete anterior que ainda não saiu é trocado pelo novo.
  update notificacoes_envios set status = 'descartada', motivo = 'substituida'
   where profile_id = v_prof and categoria = 'desafio' and status = 'pendente' and dedupe like 'trofeu:%';
  if p_codigo is null or p_titulo is null then return; end if;
  if (select count(*) from notificacoes_envios where profile_id = v_prof and dedupe like 'trofeu:%'
        and status in ('enviada', 'enviando') and tentativa_em > now() - interval '7 days') >= 3 then return; end if;
  v_amanha := (now() at time zone 'America/Sao_Paulo')::date + 1;
  insert into notificacoes_envios (profile_id, categoria, dedupe, agendada_para, expira_em, dados)
  values (v_prof, 'desafio', left('trofeu:' || p_aluno || ':' || p_codigo || ':' || v_amanha, 120),
          (v_amanha + time '11:30') at time zone 'America/Sao_Paulo',
          (v_amanha + time '20:00') at time zone 'America/Sao_Paulo',
          jsonb_build_object('titulo', left(p_titulo, 120), 'corpo', left(coalesce(p_corpo, ''), 300), 'url', left(coalesce(p_url, '/aluno/conquistas'), 200)))
  on conflict (dedupe) do update set status = 'pendente', motivo = null, dados = excluded.dados, agendada_para = excluded.agendada_para, expira_em = excluded.expira_em
    where notificacoes_envios.status in ('pendente', 'descartada');
end $$;
revoke all on function public.agendar_lembrete_trofeu(uuid, text, text, text, text) from public, anon;
grant execute on function public.agendar_lembrete_trofeu(uuid, text, text, text, text) to authenticated;
